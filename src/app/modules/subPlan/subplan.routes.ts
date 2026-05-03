import { Router } from 'express';

import { UserRole } from '../user/user.interface';
import auth from '../../middleware/auth.middleware';
import { SubscriptionPlanController } from './subplan.controller';

 
const router = Router();
 
// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/getAllPlans', SubscriptionPlanController.getAllPlans);
router.get('/getPlanById/:id', SubscriptionPlanController.getPlanById);
 
// ─── Admin Only ───────────────────────────────────────────────────────────────
router.post('/create-subplan', auth(UserRole.USER,UserRole.admin), SubscriptionPlanController.createPlan);
router.patch('/updatePlan/:id', auth(UserRole.USER,UserRole.admin), SubscriptionPlanController.updatePlan);
router.delete('/deletePlan/:id', auth(UserRole.USER,UserRole.admin), SubscriptionPlanController.deletePlan);
 
export const PlanRoutes = router;