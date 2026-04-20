
// src/modules/subscription/subscriptionPlan.routes.ts
import express from 'express';

import { UserRole } from '../user/user.interface';
import { SubscriptionPlanController } from './subplan.controller';
import auth from '../../middleware/auth.middleware';

const router = express.Router();

// ─── Public / User Route ─────────────────────────────────────────────────────
// Login ছাড়াই plan দেখতে পারবে (Register এর সময় plan choose করতে)
router.get('/active', SubscriptionPlanController.getActivePlans);

// ─── Admin Routes ────────────────────────────────────────────────────────────
router.post('/create-subplan', auth(UserRole.USER), SubscriptionPlanController.createPlan);
router.get('/subplan', auth(UserRole.USER), SubscriptionPlanController.getAllPlans);
router.get('/subplan/:id', auth(UserRole.admin), SubscriptionPlanController.getSinglePlan);
router.patch('/subplan/:id', auth(UserRole.admin), SubscriptionPlanController.updatePlan);
router.patch('/subplan/:id/toggle', auth(UserRole.admin), SubscriptionPlanController.togglePlan);
router.delete('/subplan/:id', auth(UserRole.admin), SubscriptionPlanController.deletePlan);

export const PlanRoutes = router;