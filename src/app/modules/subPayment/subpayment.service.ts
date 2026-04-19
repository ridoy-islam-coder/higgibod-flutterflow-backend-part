import Stripe from 'stripe';
import httpStatus from 'http-status';
import Payment from './subpayment.model';
import User from '../user/user.model';
import AppError from '../../error/AppError';
import Plan from '../subPlan/subplan.model';
import config from '../../config';

const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4b ─ Start Free Trial
// POST /api/v1/payments/trial/start
// ══════════════════════════════════════════════════════════════════════════════

const startFreeTrial = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
  }

  if (user.subscription?.status === 'active') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You already have an active subscription.',
    );
  }

  const trialStart = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  await User.findByIdAndUpdate(userId, {
    subscription: {
      plan: null,
      startsAt: trialStart,
      expiresAt: trialEnd,
      status: 'active',
    },
  });

  return { trialStart, trialEnd };
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 ─ Checkout / Payment
// POST /api/v1/payments/checkout
// ══════════════════════════════════════════════════════════════════════════════
const checkout = async (
  userId: string,
  payload: {
    planId: string;
    paymentMethodId: string;
    promoCode?: string;
  },
) => {
  const { planId, paymentMethodId, promoCode } = payload;

  // ── Plan ─────────────────────────────────────────────
  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Plan not found.');
  }

  // ── User ─────────────────────────────────────────────
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
  }

  // ── Promo Code ───────────────────────────────────────
  let discountAmount = 0;
  if (promoCode) {
    // const promo = await PromoCode.findOne({ code: promoCode, isActive: true });
    // if (!promo) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid promo code.');
    // discountAmount = promo.discountAmount;
  }

  const finalAmount = Math.max(0, plan.price - discountAmount);
  const amountInCents = Math.round(finalAmount * 100);

  // ── Stripe PaymentIntent ─────────────────────────────
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: (plan.currency || "USD").toLowerCase(),
    payment_method: paymentMethodId,
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
   metadata: {
    userId: userId.toString(),
    planId: planId.toString(),
  },
  });

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(
      httpStatus.PAYMENT_REQUIRED,
      'Payment failed. Please try again.',
    );
  }

  // ── Billing Period ───────────────────────────────────
  const periodStart = new Date();
  const periodEnd = new Date();

  if (plan.interval === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // ── Payment Record ───────────────────────────────────
  const paymentRecord = await Payment.create({
    user: userId,
    plan: planId,
    amount: finalAmount,
    currency: plan.currency,
    status: 'succeeded',
    paymentMethod: 'stripe',
    stripePaymentIntentId: paymentIntent.id,
    promoCode: promoCode || undefined,
    discountAmount,
    periodStart,
    periodEnd,
  });

  // ── Activate Subscription ─────────────────────────────
  await User.findByIdAndUpdate(userId, {
    subscription: {
      plan: planId,
      startsAt: periodStart,
      expiresAt: periodEnd,
      status: 'active',
    },
  });

  return {
    paymentId: paymentRecord._id,
    planName: plan.name,
    amount: finalAmount,
    currency: plan.currency,
    periodStart,
    periodEnd,
    stripePaymentIntentId: paymentIntent.id,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// Payment History
// GET /api/v1/payments/history
// ══════════════════════════════════════════════════════════════════════════════
const getPaymentHistory = async (userId: string) => {
  const payments = await Payment.find({ user: userId })
    .populate('plan', 'name price interval currency')
    .sort({ createdAt: -1 });

  return payments;
};

export const paymentServices = {
  startFreeTrial,
  checkout,
  getPaymentHistory,
};