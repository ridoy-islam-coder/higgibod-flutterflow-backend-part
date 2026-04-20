// src/modules/payment/payment.service.ts
import Stripe from 'stripe';
import config from '../../config';
import User from '../user/user.model';

import httpStatus from 'http-status';
import { Types } from 'mongoose';
import PromoCode from '../PromoCode/promocode.model';
import AppError from '../../error/AppError';
import SubscriptionPlan from '../subPlan/subplan.model';

const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// ─── 1. Free Trial Activation (Promo = 100% free) ────────────────────────────
const activateFreeTrial = async (
  userId: string,
  planId: string,
  promoCodeId: string,
  trialDays: number,
) => {
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  // User subscription update
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'subscription.plan': new Types.ObjectId(planId),
        'subscription.promoCodeUsed': new Types.ObjectId(promoCodeId),
        'subscription.status': 'trialing',
        'subscription.startsAt': now,
        'subscription.trialEndsAt': trialEndsAt,
        'subscription.expiresAt': trialEndsAt,
        isVerified: true,
      },
    },
    { new: true },
  );

  // Promo code usage বাড়াও
  await PromoCode.findByIdAndUpdate(promoCodeId, {
    $inc: { usedCount: 1 },
  });

  return {
    success: true,
    message: `Free trial activated for ${trialDays} days`,
    trialEndsAt,
    user,
  };
};




const createCheckoutSession = async (
  userId: string,
  planId: string,
  promoCodeId?: string,
) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  // ─── Stripe Customer খোঁজো বা তৈরি করো ──────────────────────────
  let stripeCustomerId = user.subscription?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
    });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(userId, {
      'subscription.stripeCustomerId': customer.id,
    });
  }

  // ─── Promo Code Discount Apply ────────────────────────────────────
  const discounts: { coupon: string }[] = [];

  if (promoCodeId) {
    const promo = await PromoCode.findById(promoCodeId);
    if (promo) {
      let stripeCoupon;

      if (promo.discountType === 'percentage') {
        // Percentage discount — যেমন 50% off
        stripeCoupon = await stripe.coupons.create({
          percent_off: promo.discountValue,
          duration: 'once',
        });
      } else if (promo.discountType === 'fixed') {
        // Fixed amount discount — যেমন $10 off
        stripeCoupon = await stripe.coupons.create({
          amount_off: promo.discountValue * 100, // cents এ
          currency: plan.currency || 'usd',
          duration: 'once',
        });
      } else if (promo.discountType === 'free_trial') {
        // Free trial হলে এখানে আসবে না
        // কারণ free trial আগেই isFree: true দিয়ে
        // activateFreeTrial এ handle হয়ে যাবে
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Free trial promo should use activate-trial API',
        );
      }

      if (stripeCoupon) {
        discounts.push({ coupon: stripeCoupon.id });
      }
    }
  }

  // ─── Checkout Session তৈরি ────────────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    subscription_data: {
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
        promoCodeId: promoCodeId ? promoCodeId.toString() : '',
      },
    },
    discounts: discounts.length > 0 ? discounts : undefined,
    metadata: {
      userId: userId.toString(),
      planId: planId.toString(),
      promoCodeId: promoCodeId ? promoCodeId.toString() : '',
    },
  success_url: `${config.backend_url}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${config.backend_url}/subscription/cancel`,
  });

  return {
    checkoutUrl: session.url,       // ← Browser এ open করো
    sessionId: session.id,
    amount: plan.price,             // ← Original price
    currency: plan.currency,
    hasDiscount: discounts.length > 0,  // ← Discount আছে কিনা
  };
};



// ─── 3. Confirm Payment & Activate Subscription ───────────────────────────────

// const confirmPaymentAndActivate = async (
//   userId: string,
//   planId: string,
//   paymentIntentId: string,
//   promoCodeId?: string,
// ) => {
//   // Stripe থেকে payment verify
//   const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//   if (paymentIntent.status !== 'succeeded') {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Payment not successful');
//   }

//   const plan = await SubscriptionPlan.findById(planId);
//   if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

//   const now = new Date();
//   const expiresAt = new Date(now);
//   if (plan.interval === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
//   else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

//   // User subscription activate
//   await User.findByIdAndUpdate(userId, {
//     $set: {
//       'subscription.plan': new Types.ObjectId(planId),
//       'subscription.status': 'active',
//       'subscription.startsAt': now,
//       'subscription.expiresAt': expiresAt,
//       'subscription.stripeSubscriptionId': paymentIntentId,
//       ...(promoCodeId && {
//         'subscription.promoCodeUsed': new Types.ObjectId(promoCodeId),
//       }),
//       isVerified: true,
//     },
//   });

//   // Promo code use count বাড়াও
//   if (promoCodeId) {
//     await PromoCode.findByIdAndUpdate(promoCodeId, {
//       $inc: { usedCount: 1 },
//     });
//   }

//   return {
//     success: true,
//     message: 'Subscription activated successfully',
//     expiresAt,
//   };
// };




// ─── 4. Stripe Webhook (production এ দরকার) ──────────────────────────────────

// const handleStripeWebhook = async (
//   rawBody: Buffer,
//   signature: string,
// ) => {
//   const webhookSecret = config.stripe_webhook_secret as string;

//   let event: Stripe.Event;
//   try {
//     event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
//   } catch {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Webhook signature verification failed');
//   }

//   if (event.type === 'payment_intent.succeeded') {
//     const paymentIntent = event.data.object as Stripe.PaymentIntent;
//     const { userId, planId, promoCodeId } = paymentIntent.metadata;
//     await confirmPaymentAndActivate(userId, planId, paymentIntent.id, promoCodeId);
//   }

//   if (event.type === 'customer.subscription.deleted') {
//     const subscription = event.data.object as Stripe.Subscription;
//     await User.findOneAndUpdate(
//       { 'subscription.stripeSubscriptionId': subscription.id },
//       { 'subscription.status': 'cancelled' },
//     );
//   }

//   return { received: true };
// };














// const createCheckoutSession = async (
//   userId: string,
//   planId: string,
//   promoCodeId?: string,
// ) => {
//   const user = await User.findById(userId);
//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

//   const plan = await SubscriptionPlan.findById(planId);
//   if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

//   // Stripe Customer খোঁজো বা তৈরি করো
//   let stripeCustomerId = user.subscription?.stripeCustomerId;
//   if (!stripeCustomerId) {
//     const customer = await stripe.customers.create({
//       email: user.email,
//       name: user.fullName,
//     });
//     stripeCustomerId = customer.id;
//     await User.findByIdAndUpdate(userId, {
//       'subscription.stripeCustomerId': customer.id,
//     });
//   }

//   // ─── Type fix ─────────────────────────────────────────────────────
//   const discounts: { coupon: string }[] = [];

//   if (promoCodeId) {
//     const promo = await PromoCode.findById(promoCodeId);
//     if (promo) {
//       let stripeCoupon;

//       if (promo.discountType === 'percentage') {
//         stripeCoupon = await stripe.coupons.create({
//           percent_off: promo.discountValue,
//           duration: 'once',
//         });
//       } else if (promo.discountType === 'fixed') {
//         stripeCoupon = await stripe.coupons.create({
//           amount_off: promo.discountValue * 100,
//           currency: plan.currency || 'usd',
//           duration: 'once',
//         });
//       }

//       if (stripeCoupon) {
//         discounts.push({ coupon: stripeCoupon.id });
//       }
//     }
//   }
// // Checkout Session তৈরি
// const session = await stripe.checkout.sessions.create({
//   customer: stripeCustomerId,
//   payment_method_types: ['card'],
//   line_items: [
//     {
//       price: plan.stripePriceId,
//       quantity: 1,
//     },
//   ],
//   mode: 'subscription',          // ✅ এখানে change করুন
//   subscription_data: {           // ✅ এটা যোগ করুন
//     metadata: {
//       userId: userId.toString(),
//       planId: planId.toString(),
//       promoCodeId: promoCodeId ? promoCodeId.toString() : '',
//     },
//   },
//   discounts: discounts.length > 0 ? discounts : undefined,
//   metadata: {
//     userId: userId.toString(),
//     planId: planId.toString(),
//     promoCodeId: promoCodeId ? promoCodeId.toString() : '',
//   },
// success_url: `${config.backend_url}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
// cancel_url: `${config.backend_url}/subscription/cancel`,
// });

//   return {
//     checkoutUrl: session.url,
//     sessionId: session.id,
//   };
// };



const confirmCheckoutSession = async (userId: string, sessionId: string) => {
  // Stripe থেকে session verify করো
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not completed');
  }

  const { planId, promoCodeId } = session.metadata as {
    planId: string;
    promoCodeId: string;
  };

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  const now = new Date();
  const expiresAt = new Date();
  if (plan.interval === 'monthly') {
    expiresAt.setMonth(now.getMonth() + 1);
  } else {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }

  // ─── DB তে save করো ──────────────────────────────────────────────
  await User.findByIdAndUpdate(userId, {
    $set: {
      'subscription.plan': planId,
      'subscription.stripePaymentIntentId': session.subscription as string,
      'subscription.stripeCustomerId': session.customer as string,  // ← এটাও save করো
      'subscription.status': 'active',
      'subscription.startsAt': now,
      'subscription.expiresAt': expiresAt,
      ...(promoCodeId && {
        'subscription.promoCodeUsed': promoCodeId,
      }),
      isVerified: true,
    },
  });

  // Promo use count বাড়াও
  if (promoCodeId) {
    await PromoCode.findByIdAndUpdate(promoCodeId, {
      $inc: { usedCount: 1 },
    });
  }

  return {
    success: true,
    message: 'Subscription activated successfully',
    expiresAt,
  };
};





// ─── Payment Success Handler ──────────────────────────────────────────────────
const handlePaymentSuccess = async (sessionId: string) => {
  if (!sessionId)
    throw new AppError(httpStatus.BAD_REQUEST, 'Session ID not found');

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid')
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not completed');

  const { userId, planId, promoCodeId } = session.metadata as {
    userId: string;
    planId: string;
    promoCodeId: string;
  };

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  const now = new Date();
  const expiresAt = new Date();
  if (plan.interval === 'monthly') {
    expiresAt.setMonth(now.getMonth() + 1);
  } else {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }

  await User.findByIdAndUpdate(userId, {
    $set: {
      'subscription.plan': planId,
      'subscription.stripePaymentIntentId': session.subscription as string,
      'subscription.stripeCustomerId': session.customer as string,
      'subscription.status': 'active',
      'subscription.startsAt': now,
      'subscription.expiresAt': expiresAt,
      ...(promoCodeId && {
        'subscription.promoCodeUsed': promoCodeId,
      }),
      isVerified: true,
    },
  });

  if (promoCodeId) {
    await PromoCode.findByIdAndUpdate(promoCodeId, {
      $inc: { usedCount: 1 },
    });
  }

  return {
    userId,
    planId,
    sessionId,
    expiresAt,
  };
};

export const PaymentService = {
  activateFreeTrial,
 handlePaymentSuccess,
 confirmCheckoutSession,
//   handleStripeWebhook,
  createCheckoutSession,
};