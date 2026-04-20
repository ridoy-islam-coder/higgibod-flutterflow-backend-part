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

// ─── 2. Create Stripe Payment Intent (Paid plan) ─────────────────────────────
const createPaymentIntent = async (
  userId: string,
  planId: string,
  promoCodeId?: string,
) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  let finalAmount = plan.price * 100; // Stripe cents এ নেয়
  let couponId: string | undefined;

  // Promo code discount apply
  if (promoCodeId) {
    const promo = await PromoCode.findById(promoCodeId);
    if (promo && promo.discountType === 'percentage') {
      const discountAmount = Math.round(finalAmount * (promo.discountValue / 100));
      finalAmount = finalAmount - discountAmount;
    } else if (promo && promo.discountType === 'fixed') {
      finalAmount = Math.max(0, finalAmount - promo.discountValue * 100);
    }
  }

  // Stripe Customer তৈরি বা খোঁজা
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

  // Payment Intent তৈরি
  const paymentIntent = await stripe.paymentIntents.create({
    amount: finalAmount,
    currency: plan.currency || 'usd',
    customer: stripeCustomerId,
    metadata: {
      userId,
      planId,
      promoCodeId: promoCodeId || '',
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    amount: finalAmount / 100,
    currency: plan.currency,
    paymentIntentId: paymentIntent.id,
  };
};

// ─── 3. Confirm Payment & Activate Subscription ───────────────────────────────
const confirmPaymentAndActivate = async (
  userId: string,
  planId: string,
  paymentIntentId: string,
  promoCodeId?: string,
) => {
  // Stripe থেকে payment verify
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not successful');
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  const now = new Date();
  const expiresAt = new Date(now);
  if (plan.interval === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
  else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  // User subscription activate
  await User.findByIdAndUpdate(userId, {
    $set: {
      'subscription.plan': new Types.ObjectId(planId),
      'subscription.status': 'active',
      'subscription.startsAt': now,
      'subscription.expiresAt': expiresAt,
      'subscription.stripeSubscriptionId': paymentIntentId,
      ...(promoCodeId && {
        'subscription.promoCodeUsed': new Types.ObjectId(promoCodeId),
      }),
      isVerified: true,
    },
  });

  // Promo code use count বাড়াও
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

export const PaymentService = {
  activateFreeTrial,
  createPaymentIntent,
  confirmPaymentAndActivate,
//   handleStripeWebhook,
};