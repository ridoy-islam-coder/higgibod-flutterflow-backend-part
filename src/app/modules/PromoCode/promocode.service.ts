// import crypto from 'crypto';
// import httpStatus from 'http-status';
// import { Types } from 'mongoose';
// import AppError from '../../error/AppError';
// import SubscriptionPlan from '../subPlan/subplan.model';
// import PromoCode from './promocode.model';


// // ─── Admin: Generate PromoCode ────────────────────────────────────────────────
// const generatePromoCode = async (
//   planId: string,
//   adminId: string,
//   expiresInDays?: number,
// ) => {
//   const plan = await SubscriptionPlan.findById(planId);
//   if (!plan || !plan.isActive) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
//   }

//   // unique random code generate
//   const code = 'PROMO-' + crypto.randomBytes(4).toString('hex').toUpperCase();

//   const expiresAt = expiresInDays
//     ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
//     : undefined;

//   const result = await PromoCode.create({
//     code,
//     plan: new Types.ObjectId(planId),
//     trialDays: plan.trialDays,
//     expiresAt,
//     createdBy: new Types.ObjectId(adminId),
//   });

//   return result;
// };

// // ─── Validate PromoCode (user checkout এর আগে check করবে) ────────────────────
// const validatePromoCode = async (code: string, planId: string) => {
//   // populate না করে directly ObjectId compare করা বেশি safe
//   const promo = await PromoCode.findOne({ code: code.toUpperCase() });
//   if (!promo || !promo.isActive) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Invalid promo code');
//   }
//   if (promo.isUsed) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Promo code already used');
//   }
//   if (promo.expiresAt && promo.expiresAt < new Date()) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Promo code has expired');
//   }
//   if (promo.plan.toString() !== planId) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Promo code is not valid for this plan');
//   }

//   // plan details populate করে return
//   const result = await promo.populate('plan', 'name price trialDays interval currency');
//   return result;
// };

// // ─── Admin: Get All PromoCodes ────────────────────────────────────────────────
// const getAllPromoCodes = async () => {
//   const result = await PromoCode.find()
//     .populate('plan', 'name price')
//     .populate('usedBy', 'fullName email')
//     .populate('createdBy', 'fullName email');
//   return result;
// };

// // ─── Admin: Delete PromoCode ──────────────────────────────────────────────────
// const deletePromoCode = async (id: string) => {
//   const result = await PromoCode.findByIdAndUpdate(
//     id,
//     { isActive: false },
//     { new: true },
//   );
//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Promo code not found');
//   }
//   return result;
// };

// // ─── Export ───────────────────────────────────────────────────────────────────
// export const PromoCodeService = {
//   generatePromoCode,
//   validatePromoCode,
//   getAllPromoCodes,
//   deletePromoCode,
// };


import crypto from 'crypto';
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/AppError';
import SubscriptionPlan from '../subPlan/subplan.model';
import PromoCode from './promocode.model';

// ─── Admin: Generate PromoCode ────────────────────────────────────────────────
const generatePromoCode = async (
  planId: string,
  adminId: string,
  expiresInDays?: number,
) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
  }

  const code = 'PROMO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  const result = await PromoCode.create({
    code,
    plan: new Types.ObjectId(planId),
    trialDays: plan.trialDays,
    expiresAt,
    createdBy: new Types.ObjectId(adminId),
  });

  return result;
};

// ─── Validate PromoCode ───────────────────────────────────────────────────────
const validatePromoCode = async (code: string, planId: string) => {
  const promo = await PromoCode.findOne({ code: code.toUpperCase() });

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

  const result = await promo.populate('plan', 'name price trialDays interval currency');
  return result;
};

// ─── Mark PromoCode As Used (payment complete হলে call করবে) ─────────────────
const markPromoCodeAsUsed = async (promoCodeId: string, userId: string) => {
  // findOneAndUpdate দিয়ে atomic operation — race condition হবে না
  const promo = await PromoCode.findOneAndUpdate(
    {
      _id: new Types.ObjectId(promoCodeId),
      isUsed: false, // শুধু unused হলেই update হবে
      isActive: true,
    },
    {
      isUsed: true,
      usedBy: new Types.ObjectId(userId),
    },
    { new: true },
  );

  // promo null মানে already used বা exist করে না — silent fail করবো
  return promo;
};

// ─── Admin: Get All PromoCodes ────────────────────────────────────────────────
const getAllPromoCodes = async () => {
  const result = await PromoCode.find()
    .populate('plan', 'name price')
    .populate('usedBy', 'fullName email')
    .populate('createdBy', 'fullName email');
  return result;
};

// ─── Admin: Delete PromoCode ──────────────────────────────────────────────────
const deletePromoCode = async (id: string) => {
  const result = await PromoCode.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Promo code not found');
  }
  return result;
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const PromoCodeService = {
  generatePromoCode,
  validatePromoCode,
  markPromoCodeAsUsed,
  getAllPromoCodes,
  deletePromoCode,
};