import httpStatus from 'http-status';

import User from '../user/user.model'; // আপনার User মডেলের পাথ
import PaymentHistory from './subpayment.model'; // আপনার নতুন কম্বাইন্ড মডেল
import AppError from '../../error/AppError';


// 🍏 =========================================================================
// ১. অ্যাপল সাবস্ক্রিপশন ভেরিফাই ও সেভ (App Store Purchase Verification)
// =========================================================================
const verifyAndSaveSubscription = async (
  userId: string,
  receiptData: string,
) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Apple সার্ভার থেকে রিসিট ভেরিফাই করো
  const verifiedReceipt = await verifyAppleReceipt(receiptData);

  if (!verifiedReceipt.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No active subscription found in receipt',
    );
  }

  const {
    productId,
    originalTransactionId,
    latestTransactionId,
    expirationDate,
  } = verifiedReceipt;

  // productId থেকে entitlement বের করো (যেমন: pro অথবা core)
  const entitlement = productId.toLowerCase().includes('pro') ? 'pro' : 'core';

  // আগের কোনো একই অ্যাপল সাবস্ক্রিপশন রেকর্ড আছে কিনা চেক করো
  const existingSubscription = await PaymentHistory.findOne({
    user: userId,
    appleOriginalTransactionId: originalTransactionId,
  });

  if (existingSubscription) {
    // আগের ডাটা থাকলে লেটেস্ট ট্রানজেকশন আপডেট করো
    await PaymentHistory.updateOne(
      { _id: existingSubscription._id },
      {
        productId,
        entitlement,
        status: 'active',
        expiredAt: expirationDate,
        appleLatestTransactionId: latestTransactionId,
        appleReceiptData: receiptData,
        store: 'APP_STORE',
      },
    );
  } {
    // একদম নতুন পারচেজ হলে—ইউজারের আগের সব একটিভ রেকর্ড বাতিল (cancelled) করো
    await PaymentHistory.updateMany(
      { user: userId, status: 'active' },
      { status: 'cancelled' },
    );

    // নতুন সাবস্ক্রিপশন রেকর্ড তৈরি করো
    await PaymentHistory.create({
      user: userId,
      productId,
      entitlement,
      store: 'APP_STORE',
      status: 'active',
      expiredAt: expirationDate,
      appleOriginalTransactionId: originalTransactionId,
      appleLatestTransactionId: latestTransactionId,
      appleReceiptData: receiptData,
    });
  }

  // ইউজারের মূল প্রোফাইলে packageExpiry আপডেট করো
  await User.updateOne({ _id: userId }, { packageExpiry: expirationDate });

  return {
    success: true,
    productId,
    entitlement,
    expiredAt: expirationDate,
    isProUser: entitlement === 'pro',
  };
};

// 🤖 =========================================================================
// ২. গুগল প্লে সাবস্ক্রিপশন ভেরিফাই ও সেভ (Google Play Purchase Verification)
// =========================================================================
const verifyAndSavePlaySubscription = async (
  userId: string,
  payload: { productId: string; purchaseToken: string },
) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const { productId, purchaseToken } = payload;
  
  // গুগল প্লে স্টোর থেকে রিসিট ডাটা নিয়ে আসো
  const receipt = await verifyPlayReceipt(
    'com.fototidy.fotoTidy',
    productId,
    purchaseToken,
  );

  // মিলিসেকেন্ড থেকে জাভাস্ক্রিপ্ট ডেট-এ কনভার্ট করো
  const expiredAt = receipt.expiryTimeMillis
    ? new Date(Number(receipt.expiryTimeMillis))
    : null;

  const isActive = expiredAt ? expiredAt > new Date() : false;
  const isCancelled =
    receipt.cancelReason !== null && receipt.cancelReason !== undefined;

  let status: 'active' | 'expired' | 'cancelled' | 'grace_period' = 'active';
  if (isCancelled) status = 'cancelled';
  else if (!isActive) status = 'expired';
  else status = 'active';

  const entitlement = productId.toLowerCase().includes('pro') ? 'pro' : 'core';

  // ডাটা থাকলে আপডেট করো, না থাকলে নতুন তৈরি (upsert) করো
  await PaymentHistory.updateOne(
    { user: userId, store: 'PLAY_STORE' },
    {
      user: userId,
      productId,
      entitlement,
      store: 'PLAY_STORE',
      status,
      expiredAt,
      googlePurchaseToken: purchaseToken, // ✅ আপনার নতুন মডেলের ফিল্ড নেম
      googleOrderId: receipt.orderId || null, // গুগল থেকে পাওয়া অর্ডার আইডি
    },
    { upsert: true },
  );

  if (expiredAt && status === 'active') {
    await User.updateOne({ _id: userId }, { packageExpiry: expiredAt });
  }

  return {
    productId,
    entitlement,
    expiredAt,
    status,
    isProUser: entitlement === 'pro',
  };
};

// 🍏 🔔 =======================================================================
// ৩. অ্যাপল সার্ভার নোটিফিকেশন হ্যান্ডলার (Apple Webhook)
// =========================================================================
const handleAppleWebhook = async (payload: any) => {
  console.log('📥 Apple Webhook:', payload.notificationType);

  const notificationType = payload.notificationType;
  const latestReceiptInfo =
    payload.unified_receipt?.latest_receipt_info?.[0] ||
    payload.latest_receipt_info?.[0];

  if (!latestReceiptInfo) {
    console.warn('No receipt info in webhook payload');
    return { success: false };
  }

  const originalTransactionId = latestReceiptInfo.original_transaction_id;
  const productId = latestReceiptInfo.product_id;
  const expirationDateMs = latestReceiptInfo.expires_date_ms;
  const expirationDate = expirationDateMs
    ? new Date(parseInt(expirationDateMs))
    : null;

  // ডাটাবেজ থেকে অ্যাপল ট্রানজেকশন অনুযায়ী সাবস্ক্রিপশন খোঁজো
  const subscription = await PaymentHistory.findOne({
    appleOriginalTransactionId: originalTransactionId,
  });

  if (!subscription) {
    console.warn(
      'Subscription not found for transaction:',
      originalTransactionId,
    );
    return { success: false };
  }

  const userId = subscription.user.toString();

  // নোটিফিকেশন টাইপ অনুযায়ী স্ট্যাটাস হ্যান্ডেল করো
  switch (notificationType) {
    case 'DID_RENEW':
    case 'INITIAL_BUY':
      // রিনিউ বা নতুন করে কিনলে স্ট্যাটাস একটিভ করো
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        {
          status: 'active',
          expiredAt: expirationDate,
          appleLatestTransactionId: latestReceiptInfo.transaction_id,
          productId,
        },
      );
      await User.updateOne({ _id: userId }, { packageExpiry: expirationDate });
      console.log(`✅ Renewed: ${productId} | Expires: ${expirationDate}`);
      break;

    case 'DID_CHANGE_RENEWAL_PREF':
    case 'DID_CHANGE_RENEWAL_STATUS':
      // অটো-রিনিউ অন/অফ ট্র্যাকিং
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { expiredAt: expirationDate },
      );
      break;

    case 'CANCEL':
      // অ্যাপল রিফান্ড করে ক্যানসেল করে দিলে প্রিমিয়াম অ্যাক্সেস বন্ধ করো
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { status: 'cancelled', expiredAt: null },
      );
      await User.updateOne({ _id: userId }, { packageExpiry: null });
      console.log(`❌ Cancelled: ${originalTransactionId}`);
      break;

    case 'DID_FAIL_TO_RENEW':
      // পেমেন্ট ফেইল করলে গ্রেস পিরিয়ডে পাঠাও
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { status: 'grace_period' },
      );
      console.log(`⚠️ Grace period: ${originalTransactionId}`);
      break;

    case 'EXPIRED':
      // মেয়াদ শেষ হয়ে গেলে অ্যাক্সেস ব্লক করো
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { status: 'expired', expiredAt: expirationDate },
      );
      await User.updateOne({ _id: userId }, { packageExpiry: null });
      console.log(`🕐 Expired: ${originalTransactionId}`);
      break;

    default:
      console.log('Unhandled notification type:', notificationType);
  }

  return { success: true, notificationType, originalTransactionId };
};

// 🤖 🔔 =======================================================================
// ৪. গুগল প্লে নোটিফিকেশন হ্যান্ডলার (Google Play Webhook)
// =========================================================================
const handlePlayWebhook = async (payload: any) => {
  console.log(
    '📥 Play Store Webhook:',
    payload.subscriptionNotification?.notificationType,
  );

  const subscriptionNotification = payload.subscriptionNotification;
  if (!subscriptionNotification) {
    console.warn('No subscriptionNotification in webhook payload');
    return { success: false };
  }

  const { notificationType, purchaseToken, subscriptionId } =
    subscriptionNotification;

  // প্রোডাক্ট আইডি এবং প্লে স্টোর এনাম ধরে ডাটাবেজে সাবস্ক্রিপশন খোঁজো
  const subscription = await PaymentHistory.findOne({
    productId: subscriptionId,
    store: 'PLAY_STORE',
  });

  if (!subscription) {
    console.warn('Subscription not found for Google Play ID:', subscriptionId);
    return { success: false };
  }

  const userId = subscription.user.toString();

  switch (notificationType) {
    case 1: // SUBSCRIPTION_RECOVERED
    case 2: // SUBSCRIPTION_RENEWED
    case 4: {
      // পেমেন্ট সফল বা রিনিউ হলে ফ্রেশ এক্সপায়ারি ডেট নাও
      const receipt = await verifyPlayReceipt(
        'com.fototidy.fotoTidy',
        subscriptionId,
        purchaseToken,
      );
      const expiredAt = receipt.expiryTimeMillis
        ? new Date(Number(receipt.expiryTimeMillis))
        : null;

      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { status: 'active', expiredAt, googlePurchaseToken: purchaseToken },
      );
      if (expiredAt) {
        await User.updateOne({ _id: userId }, { packageExpiry: expiredAt });
      }
      console.log(`✅ Active: ${subscriptionId} | Expires: ${expiredAt}`);
      break;
    }

    case 5: // SUBSCRIPTION_ON_HOLD
    case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { status: 'grace_period' },
      );
      console.log(`⚠️ Grace period: ${subscriptionId}`);
      break;

    case 3: // SUBSCRIPTION_CANCELED
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { status: 'cancelled', expiredAt: null },
      );
      await User.updateOne({ _id: userId }, { packageExpiry: null });
      console.log(`❌ Cancelled: ${subscriptionId}`);
      break;

    case 13: // SUBSCRIPTION_EXPIRED
      await PaymentHistory.updateOne(
        { _id: subscription._id },
        { status: 'expired' },
      );
      await User.updateOne({ _id: userId }, { packageExpiry: null });
      console.log(`🕐 Expired: ${subscriptionId}`);
      break;

    default:
      console.log('Unhandled Play notification type:', notificationType);
  }

  return { success: true, notificationType, subscriptionId };
};

// সার্ভিসগুলো এক্সপোর্ট করা হলো
export const SubscriptionServices = {
  verifyAndSaveSubscription,
  verifyAndSavePlaySubscription,
  handleAppleWebhook,
  handlePlayWebhook,
};