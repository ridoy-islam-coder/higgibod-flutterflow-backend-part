
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
router.post('/', auth(UserRole.admin), SubscriptionPlanController.createPlan);
router.get('/', auth(UserRole.admin), SubscriptionPlanController.getAllPlans);
router.get('/:id', auth(UserRole.admin), SubscriptionPlanController.getSinglePlan);
router.patch('/:id', auth(UserRole.admin), SubscriptionPlanController.updatePlan);
router.patch('/:id/toggle', auth(UserRole.admin), SubscriptionPlanController.togglePlan);
router.delete('/:id', auth(UserRole.admin), SubscriptionPlanController.deletePlan);

export const PlanRoutes = router;