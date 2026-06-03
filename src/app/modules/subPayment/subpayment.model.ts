
import { model, Schema } from 'mongoose';
import { PaymentHistoryModel, TPaymentHistory } from './subpayment.interface';

// ─── Schema ───────────────────────────────────────────────────────────────────
const PaymentHistorySchema = new Schema<TPaymentHistory, PaymentHistoryModel>(
  {
    // 👤 কমন ইউজার ফিল্ড (All Platforms)
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 📋 প্ল্যান (Stripe বা লোকাল ডাটাবেজ প্ল্যানের রেফারেন্স)
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: false, 
    },
    promoCode: {
      type: Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },

    // 💳 [ STRIPE ] — ওয়েব/কার্ড পেমেন্টের জন্য নির্দিষ্ট ফিল্ডস
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true, 
    },
    stripeSubscriptionId: { type: String },
    stripeInvoiceId: { type: String },

    // 🍏 [ APPLE APP STORE ] — আইফোন অ্যাপের সাবস্ক্রিপশনের জন্য ফিল্ডস
    appleOriginalTransactionId: { type: String, index: true }, // অ্যাপলের প্রথম ট্রানজেকশন আইডি (আজীবন সেম থাকে)
    appleLatestTransactionId: { type: String, index: true },   // অ্যাপলের প্রতিবার রিনিউ হওয়ার লেটেস্ট ট্রানজেকশন আইডি
    appleReceiptData: { type: String },                         // অ্যাপল থেকে পাওয়া র (Raw) রিসিট ডাটা

    // 🤖 [ GOOGLE PLAY STORE ] — অ্যান্ড্রয়েড অ্যাপের সাবস্ক্রিপশনের জন্য ফিল্ডস
    googlePurchaseToken: { type: String, index: true },       // গুগলের পেমেন্ট ভেরিফাই করার মেইন টোকেন (খুবই গুরুত্বপূর্ণ)
    googleOrderId: { type: String, index: true },             // গুগলের অর্ডারের ইউনিক আইডি (যেমন: GPA.3333-....)

    // 📱 [ COMMON MOBILE FIELDS ] — অ্যাপল এবং গুগল দুজনের জন্যই যা ব্যবহার হবে
    productId: {
      type: String,
      index: true, // স্টোরের প্ল্যান আইডি (যেমন: "core_monthly", "pro_yearly")
    },
    entitlement: { 
      type: String, 
      index: true, // অ্যাপের ভেতর কি ফিচার আনলক হবে (যেমন: "premium_access")
    }, 

    // 🛒 [ STORE TRACKING ] — পেমেন্টটি কোথা থেকে এসেছে (Stripe, Apple নাকি Google)
    store: {
      type: String,
      enum: ['STRIPE', 'APP_STORE', 'PLAY_STORE'], 
      default: 'STRIPE',
      index: true,
    },

    // 💰 [ MONEY & CURRENCY ] — পেমেন্টের অ্যামাউন্ট (কমন ফিল্ডস)
    amount: {
      type: Number,
      required: false, 
      default: 0, // সেন্টস (Cents) এ হিসাব হবে
    },
    currency: {
      type: String,
      default: 'usd',
    },

    // 🔄 [ LIFE CYCLE STATUS ] — সাবস্ক্রিপশন এবং পements এর বর্তমান অবস্থা
    status: {
      type: String,
      enum: [
        'pending',
        'succeeded',
        'failed',
        'refunded',
        'active',
        'expired',
        'cancelled',
        'grace_period'
      ], 
      default: 'pending',
      index: true,
    },

    // ⏳ [ DATES & TRIALS ] — ট্রায়াল এবং মেয়াদ শেষ হওয়ার তারিখ (Stripe, Apple, Google সবার জন্য)
    isTrial: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    paidAt: {
      type: Date,
    },
    expiredAt: {
      type: Date,
      index: true, // সাবস্ক্রিপশনের মেয়াদ ঠিক কবে শেষ হবে তার ডেট
    },

    // 🗑️ [ SOFT DELETE ] — ডাটাবেজ ট্র্যাকিং সুরক্ষার জন্য
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Model ────────────────────────────────────────────────────────────────────
const PaymentHistory = model<TPaymentHistory, PaymentHistoryModel>(
  'PaymentHistory',
  PaymentHistorySchema,
);

export default PaymentHistory;