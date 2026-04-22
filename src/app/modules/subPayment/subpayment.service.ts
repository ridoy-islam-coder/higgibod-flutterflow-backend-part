import httpStatus from 'http-status';
// এটা দাও
import Stripe from 'stripe';
import { Types } from 'mongoose';
import AppError from '../../error/AppError';
import SubscriptionPlan from '../subPlan/subplan.model';

import PaymentHistory from './subpayment.model';
import User from '../user/user.model';
import PromoCode from '../PromoCode/promocode.model';
import config from '../../config';

// ── Stripe instance ──
// const stripe = new Stripe(config.stripe.stripe_secret_key as string, {
//   apiVersion: '2026-03-25.dahlia',
// });


const stripe = new Stripe(config.stripe.stripe_secret_key as string);
const createCheckoutSession = async (
  userId: string,
  planId: string,
  promoCode?: string,
) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
  }

  // ─── Promo Code Flow (0 টাকা, Stripe bypass) ─────────────────────────────
  if (promoCode) {
    const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() });

    if (!promo || !promo.isActive) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invalid promo code');
    }
    if (promo.isUsed) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Promo code already used');
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Promo code has expired');
    }
    if (promo.plan.toString() !== planId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Promo code is not valid for this plan');
    }

    const now = new Date();
    const trialDays = promo.trialDays;
    const expiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    // ── Atomic: race condition থেকে বাঁচাবে ──
    const updatedPromo = await PromoCode.findOneAndUpdate(
      { _id: promo._id, isUsed: false },
      { isUsed: true, usedBy: new Types.ObjectId(userId) },
      { new: true },
    );

    if (!updatedPromo) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Promo code already used');
    }

    // ── Payment History (0 টাকা) ──
    await PaymentHistory.create({
      user: new Types.ObjectId(userId),
      plan: new Types.ObjectId(planId),
      promoCode: promo._id,
      stripeSessionId: `PROMO-${promo._id}-${userId}-${Date.now()}`, // fake unique id
      amount: 0,
      currency: plan.currency ?? 'usd',
      status: 'succeeded',
      isTrial: true,
      trialDays,
      paidAt: now,
    });

    // ── User subscription update ──
    await User.findByIdAndUpdate(userId, {
      subscription: {
        plan: new Types.ObjectId(planId),
        startsAt: now,
        expiresAt,
        trialEndsAt: expiresAt,
        promoCodeUsed: promo._id,
        status: 'trialing',
      },
    });

    return { url: null, message: 'Plan activated successfully with promo code', isFree: true };
  }

  // ─── Normal Stripe Checkout Flow ──────────────────────────────────────────
 // ✅ Stripe v22
const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0]= {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId: userId.toString(),
      planId: planId.toString(),
      promoCodeId: '',
      trialDays: '0',
     },
   success_url: `${config.backend_url}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
   cancel_url: `${config.backend_url}/payment/cancel`,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await PaymentHistory.create({
    user: new Types.ObjectId(userId),
    plan: new Types.ObjectId(planId),
    promoCode: null,
    stripeSessionId: session.id,
    amount: plan.price,
    currency: plan.currency ?? 'usd',
    status: 'pending',
    isTrial: false,
    trialDays: 0,
  });

  return { url: session.url, isFree: false };
};




const handleStripeWebhook = async (rawBody: Buffer, signature: string) => {
  let event: ReturnType<typeof stripe.webhooks.constructEvent>;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid webhook signature');
  }

  // ── checkout.session.completed ──────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, planId, promoCodeId, trialDays } = session.metadata!;
    const isTrial = Number(trialDays) > 0;

    const stripeSubscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    const startsAt = new Date(stripeSubscription.start_date * 1000);

    // ✅ Stripe v22: current_period_end নেই — items.data থেকে নাও
    const currentPeriodEnd = (stripeSubscription as any).current_period_end
      ?? stripeSubscription.items?.data?.[0]?.current_period_end;
    const expiresAt = new Date(currentPeriodEnd * 1000);

    const trialEndsAt = stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null;

    await PaymentHistory.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        status: 'succeeded',
        stripeSubscriptionId: session.subscription as string,
        paidAt: new Date(),
        amount: session.amount_total ?? 0,
      },
    );

    if (promoCodeId) {
      await PromoCode.findOneAndUpdate(
        { _id: new Types.ObjectId(promoCodeId), isUsed: false },
        { isUsed: true, usedBy: new Types.ObjectId(userId) },
      );
    }

    await User.findByIdAndUpdate(userId, {
      subscription: {
        plan: new Types.ObjectId(planId),
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        startsAt,
        expiresAt,
        trialEndsAt: trialEndsAt ?? undefined,
        promoCodeUsed: promoCodeId ? new Types.ObjectId(promoCodeId) : undefined,
        status: isTrial ? 'trialing' : 'active',
      },
    });
  }

  // ── customer.subscription.updated ───────────────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;

    // ✅ Stripe v22: current_period_end items থেকে নাও
    const currentPeriodEnd = (subscription as any).current_period_end
      ?? subscription.items?.data?.[0]?.current_period_end;

    if (subscription.status === 'active') {
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        {
          'subscription.status': 'active',
          'subscription.expiresAt': new Date(currentPeriodEnd * 1000),
          'subscription.trialEndsAt': undefined,
        },
      );

      await PaymentHistory.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          status: 'succeeded',
          paidAt: new Date(),
        },
      );
    }

    if (subscription.status === 'canceled') {
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        { 'subscription.status': 'cancelled' },
      );
    }
  }

  // ── invoice.payment_failed ───────────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;

    // ✅ Stripe v22: invoice.subscription নেই — invoice.parent থেকে নাও
    const subscriptionId =
      (invoice as any).subscription ??
      (invoice.parent as any)?.subscription_details?.subscription ??
      null;

    if (subscriptionId) {
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscriptionId },
        { 'subscription.status': 'expired' },
      );

      await PaymentHistory.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { status: 'failed' },
      );
    }
  }

  return { received: true };
};


// ─── Get My Payment History ───────────────────────────────────────────────────
const getMyPaymentHistory = async (userId: string) => {
  const result = await PaymentHistory.find({ user: new Types.ObjectId(userId) })
    .populate('plan', 'name price interval currency')
    .populate('promoCode', 'code trialDays')
    .sort({ createdAt: -1 });
  return result;
};

// ─── Admin: Get All Payment History ──────────────────────────────────────────
const getAllPaymentHistory = async () => {
  const result = await PaymentHistory.find()
    .populate('user', 'fullName email')
    .populate('plan', 'name price interval currency')
    .populate('promoCode', 'code trialDays')
    .sort({ createdAt: -1 });
  return result;
};

// ─── Cancel Subscription ──────────────────────────────────────────────────────
const cancelSubscription = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user || !user.subscription?.stripeSubscriptionId) {
    throw new AppError(httpStatus.NOT_FOUND, 'No active subscription found');
  }

  if (user.subscription.status === 'cancelled') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Subscription already cancelled');
  }

  await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);

  await User.findByIdAndUpdate(userId, {
    'subscription.status': 'cancelled',
  });

  return { message: 'Subscription cancelled successfully' };
};
















// ─── Export ───────────────────────────────────────────────────────────────────
export const PaymentService = {
  createCheckoutSession,
  handleStripeWebhook,
  getMyPaymentHistory,
  getAllPaymentHistory,
  cancelSubscription,
};







