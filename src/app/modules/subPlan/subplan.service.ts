
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { IPlan } from './subplan.interface';
import SubscriptionPlan from './subplan.model';
 
// ─── Admin: Create Plan ──────────────────────────────────────────────────────
const createPlan = async (payload: Partial<IPlan>) => {
  // Same name already exists check
  const exists = await SubscriptionPlan.findOne({ name: payload.name });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, `"${payload.name}" plan already exists`);
  }
 
  const plan = await SubscriptionPlan.create(payload);
  return plan;
};
 
// ─── Admin: Get All Plans (active + inactive) ────────────────────────────────
const getAllPlans = async () => {
  return SubscriptionPlan.find().sort({ createdAt: 1 });
};
 
// ─── Public / User: Get Active Plans only ───────────────────────────────────
const getActivePlans = async () => {
  return SubscriptionPlan.find({ isActive: true }).sort({ createdAt: 1 });
};
 
// ─── Admin: Get Single Plan by ID ────────────────────────────────────────────
const getSinglePlan = async (id: string) => {
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');
  return plan;
};
 
// ─── Admin: Update Plan ──────────────────────────────────────────────────────
const updatePlan = async (id: string, payload: Partial<IPlan>) => {
  const plan = await SubscriptionPlan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');
 
  // price object partially update করার জন্য merge করো
  if (payload.price) {
    payload.price = {
      monthly: payload.price.monthly ?? plan.price.monthly,
      threeMonth: payload.price.threeMonth ?? plan.price.threeMonth,
      sixMonth: payload.price.sixMonth ?? plan.price.sixMonth,
      yearly: payload.price.yearly ?? plan.price.yearly,
    };
  }
 
  const updated = await SubscriptionPlan.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
 
  return updated;
};
 
// ─── Admin: Toggle Plan active/inactive ──────────────────────────────────────
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