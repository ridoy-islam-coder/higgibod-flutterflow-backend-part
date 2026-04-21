
import express from 'express';
import auth from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.interface';
import { SubscriptionPlanController } from './subplan.controller';
 
const router = express.Router();
 
// ─── Public Route (no auth) ──────────────────────────────────────────────────
// User register/login ছাড়াই plan দেখতে পারবে
router.get('/active', SubscriptionPlanController.getActivePlans);
 
// ─── Admin Routes ────────────────────────────────────────────────────────────
router.post(
  '/',
  auth(UserRole.admin),
  SubscriptionPlanController.createPlan,
);
 
router.get(
  '/',
  auth(UserRole.admin),
  SubscriptionPlanController.getAllPlans,
);
 
router.get(
  '/:id',
  auth(UserRole.admin),
  SubscriptionPlanController.getSinglePlan,
);
 
router.patch(
  '/:id',
  auth(UserRole.admin),
  SubscriptionPlanController.updatePlan,
);
 
router.patch(
  '/:id/toggle',
  auth(UserRole.admin),
  SubscriptionPlanController.togglePlan,
);
 
router.delete(
  '/:id',
  auth(UserRole.admin),
  SubscriptionPlanController.deletePlan,
);
 
export const PlanRoutes = router;