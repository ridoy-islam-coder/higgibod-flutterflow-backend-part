import { Router } from 'express';

import { UserRole } from '../user/user.interface';
import auth from '../../middleware/auth.middleware';
import { SubscriptionPlanController } from './subplan.controller';

 
const router = Router();
 
// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', SubscriptionPlanController.getAllPlans);
router.get('/:id', SubscriptionPlanController.getPlanById);
 
// ─── Admin Only ───────────────────────────────────────────────────────────────
router.post('/create-subplan', auth(UserRole.USER), SubscriptionPlanController.createPlan);
router.patch('/:id', auth(UserRole.admin), SubscriptionPlanController.updatePlan);
router.delete('/:id', auth(UserRole.admin), SubscriptionPlanController.deletePlan);
 
export const PlanRoutes = router;