// src/modules/subscription/subscriptionPlan.service.ts
import httpStatus from 'http-status';

import Stripe from 'stripe';
import config from '../../config';
import { TSubscriptionPlan } from './subplan.interface';
import SubscriptionPlan from './subplan.model';
import AppError from '../../error/AppError';

const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// ─── Admin: Create Plan ──────────────────────────────────────────────────────
const createPlan = async (payload: TSubscriptionPlan) => {
  // Stripe এ Product তৈরি করো
  const stripeProduct = await stripe.products.create({
    name: payload.name,
  });

  // Stripe এ Price তৈরি করো
  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.round(payload.price * 100), // cents এ
    currency: payload.currency || 'usd',
    recurring: {
      interval: payload.interval === 'monthly' ? 'month' : 'year',
    },
  });

  // DB তে save করো
  const plan = await SubscriptionPlan.create({
    ...payload,
    stripePriceId: stripePrice.id,
  });

  return plan;
};

// ─── Admin: Get All Plans ────────────────────────────────────────────────────
const getAllPlans = async () => {
  return SubscriptionPlan.find();
};

// ─── User + Admin: Get Active Plans ─────────────────────────────────────────
const getActivePlans = async () => {
  return SubscriptionPlan.find({ isActive: true });
};

// ─── Admin: Get Single Plan ──────────────────────────────────────────────────
const getSinglePlan = async (id: string) => {
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');
  return plan;
};

// ─── Admin: Update Plan ──────────────────────────────────────────────────────
const updatePlan = async (id: string, payload: Partial<TSubscriptionPlan>) => {
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  // Price বা interval change হলে Stripe এ নতুন Price তৈরি করো
  if (payload.price || payload.interval || payload.currency) {
    const stripePrice = await stripe.prices.create({
      product: (
        await stripe.prices.retrieve(plan.stripePriceId)
      ).product as string,
      unit_amount: Math.round((payload.price || plan.price) * 100),
      currency: payload.currency || plan.currency,
      recurring: {
        interval:
          (payload.interval || plan.interval) === 'monthly' ? 'month' : 'year',
      },
    });

    // পুরানো Stripe price archive করো
    await stripe.prices.update(plan.stripePriceId, { active: false });

    payload.stripePriceId = stripePrice.id;
  }

  // Plan name change হলে Stripe product ও update করো
  if (payload.name) {
    const oldPrice = await stripe.prices.retrieve(plan.stripePriceId);
    await stripe.products.update(oldPrice.product as string, {
      name: payload.name,
    });
  }

  const updated = await SubscriptionPlan.findByIdAndUpdate(id, payload, {
    new: true,
  });

  return updated;
};

// ─── Admin: Toggle Active/Inactive ──────────────────────────────────────────
const togglePlan = async (id: string) => {
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  plan.isActive = !plan.isActive;
  await plan.save();
  return plan;
};

// ─── Admin: Delete Plan ──────────────────────────────────────────────────────
const deletePlan = async (id: string) => {
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  // Stripe এ price archive করো
  await stripe.prices.update(plan.stripePriceId, { active: false });

  await SubscriptionPlan.findByIdAndDelete(id);
  return { deleted: true };
};

export const SubscriptionPlanService = {
  createPlan,
  getAllPlans,
  getActivePlans,
  getSinglePlan,
  updatePlan,
  togglePlan,
  deletePlan,
};