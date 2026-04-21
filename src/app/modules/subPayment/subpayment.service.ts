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
const stripe = new Stripe(config.stripe.stripe_secret_key as string, {
  apiVersion: '2026-03-25.dahlia',
});

// ─── Create Checkout Session ──────────────────────────────────────────────────
const createCheckoutSession = async (
  userId: string,
  planId: string,
  promoCode?: string,
) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
  }

  let trialDays = 0;
  let promoCodeId: string | null = null;

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

    trialDays = promo.trialDays;
    promoCodeId = promo._id.toString();
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    ...(trialDays > 0 && {
      subscription_data: {
        trial_period_days: trialDays,
      },
    }),
    // metadata: {
    //   userId,
    //   planId,
    //   promoCodeId: promoCodeId ?? '',
    //   trialDays: trialDays.toString(),
    // },


  metadata: {
  userId: userId.toString(),
  planId: planId.toString(),
  promoCodeId: promoCodeId ? promoCodeId.toString() : '',
  trialDays: trialDays.toString(),
},
    success_url: `${config.backend_url}/payment/subscription?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.backend_url}/subscription/cancel`,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await PaymentHistory.create({
    user: new Types.ObjectId(userId),
    plan: new Types.ObjectId(planId),
    promoCode: promoCodeId ? new Types.ObjectId(promoCodeId) : null,
    stripeSessionId: session.id,
    amount: trialDays > 0 ? 0 : plan.price,
    currency: plan.currency ?? 'usd',
    status: 'pending',
    isTrial: trialDays > 0,
    trialDays,
  });

  return { url: session.url };
};

// ─── Stripe Webhook Handler ───────────────────────────────────────────────────
const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string,
) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid webhook signature');
  }

  // ── checkout.session.completed ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, planId, promoCodeId, trialDays } = session.metadata!;
    const isTrial = Number(trialDays) > 0;

    const stripeSubscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    const startsAt = new Date(stripeSubscription.start_date * 1000);
    const expiresAt = new Date(
      (stripeSubscription as any).current_period_end * 1000,
    );
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
        {
          _id: new Types.ObjectId(promoCodeId),
          isUsed: false,
        },
        {
          isUsed: true,
          usedBy: new Types.ObjectId(userId),
        },
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

  // ── customer.subscription.updated ──
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;

    if (subscription.status === 'active') {
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        {
          'subscription.status': 'active',
          'subscription.expiresAt': new Date(
            (subscription as any).current_period_end * 1000,
          ),
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

  // ── invoice.payment_failed ──
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;

    await User.findOneAndUpdate(
      { 'subscription.stripeSubscriptionId': (invoice as any).subscription },
      { 'subscription.status': 'expired' },
    );

    await PaymentHistory.findOneAndUpdate(
      { stripeSubscriptionId: (invoice as any).subscription },
      { status: 'failed' },
    );
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







