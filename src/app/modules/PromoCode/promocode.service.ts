// src/modules/promoCode/promoCode.service.ts
import httpStatus from 'http-status';

import { Types } from 'mongoose';
import { TPromoCode } from './promocode.interface';
import PromoCode from './promocode.model';
import AppError from '../../error/AppError';
import SubscriptionPlan from '../subPlan/subplan.model';

// ─── Admin: Create Promo Code ───────────────────────────────────────────────
const createPromoCode = async (
  payload: Partial<TPromoCode>,
  adminId: string,
) => {
  const promoCode = await PromoCode.create({
    ...payload,
    code: payload.code?.toUpperCase(),
    createdBy: new Types.ObjectId(adminId),
  });
  return promoCode;
};

// ─── Admin: Get All Promo Codes ──────────────────────────────────────────────
const getAllPromoCodes = async () => {
  return PromoCode.find().populate('applicablePlans').populate('createdBy', 'fullName email');
};

// ─── Admin: Toggle Active ────────────────────────────────────────────────────
const togglePromoCode = async (id: string) => {
  const promo = await PromoCode.findById(id);
  if (!promo) throw new AppError(httpStatus.NOT_FOUND, 'Promo code not found');
  promo.isActive = !promo.isActive;
  await promo.save();
  return promo;
};

// ─── User: Validate Promo Code ───────────────────────────────────────────────
const validatePromoCode = async (code: string, planId: string) => {
  const promo = await PromoCode.findOne({ code: code.toUpperCase() });

  if (!promo) throw new AppError(httpStatus.NOT_FOUND, 'Invalid promo code');
  if (!promo.isActive) throw new AppError(httpStatus.BAD_REQUEST, 'Promo code is inactive');
  if (promo.usedCount >= promo.maxUses)
    throw new AppError(httpStatus.BAD_REQUEST, 'Promo code usage limit reached');
  if (promo.expiresAt && new Date() > promo.expiresAt)
    throw new AppError(httpStatus.BAD_REQUEST, 'Promo code has expired');

  // Plan check — empty array মানে সব plan এ apply হবে
  if (
    promo.applicablePlans.length > 0 &&
    !promo.applicablePlans.some((p) => p.toString() === planId)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Promo code not valid for this plan',
    );
  }

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');

  // Calculate final price
  let finalPrice = plan.price;
  let isFree = false;
  let trialDays = 0;

  if (promo.discountType === 'free_trial') {
    isFree = true;
    trialDays = promo.trialDays || plan.trialDays;
    finalPrice = 0;
  } else if (promo.discountType === 'percentage') {
    finalPrice = plan.price - (plan.price * promo.discountValue) / 100;
    if (finalPrice <= 0) { isFree = true; finalPrice = 0; }
  } else if (promo.discountType === 'fixed') {
    finalPrice = plan.price - promo.discountValue;
    if (finalPrice <= 0) { isFree = true; finalPrice = 0; }
  }

  return {
    valid: true,
    promoCode: promo,
    plan,
    originalPrice: plan.price,
    finalPrice,
    isFree,
    trialDays,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
  };
};






















// promoCode.service.ts এ এই ২টা যোগ করুন

// ─── Admin: Get Single Promo Code ────────────────────────────────────────────
const getSinglePromoCode = async (id: string) => {
  const promo = await PromoCode.findById(id)
    .populate('applicablePlans')
    .populate('createdBy', 'fullName email');

  if (!promo) throw new AppError(httpStatus.NOT_FOUND, 'Promo code not found');
  return promo;
};

// ─── Admin: Update Promo Code ────────────────────────────────────────────────
const updatePromoCode = async (id: string, payload: Partial<TPromoCode>) => {
  const promo = await PromoCode.findById(id);
  if (!promo) throw new AppError(httpStatus.NOT_FOUND, 'Promo code not found');

  // Code update হলে uppercase করো
  if (payload.code) payload.code = payload.code.toUpperCase();

  const updated = await PromoCode.findByIdAndUpdate(id, payload, { new: true });
  return updated;
};

// ─── Admin: Delete Promo Code ────────────────────────────────────────────────
const deletePromoCode = async (id: string) => {
  const promo = await PromoCode.findById(id);
  if (!promo) throw new AppError(httpStatus.NOT_FOUND, 'Promo code not found');

  await PromoCode.findByIdAndDelete(id);
  return { deleted: true };
};

// Export এ যোগ করুন
export const PromoCodeService = {
  createPromoCode,
  getAllPromoCodes,
  getSinglePromoCode,   // ← নতুন
  updatePromoCode,      // ← নতুন
  deletePromoCode,      // ← নতুন
  togglePromoCode,
  validatePromoCode,
};