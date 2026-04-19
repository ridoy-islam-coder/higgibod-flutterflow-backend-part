import express from 'express';
import { PaymentControllers } from './subpayment.controller';
import { USER_ROLE } from '../user/user.constant';
import auth from '../../middleware/auth.middleware';

const router = express.Router();
 
// ── Checkout & Payment ───────────────────────────────────────────────────────
router.post('/checkout', auth(USER_ROLE.USER), PaymentControllers.checkout);
router.post('/free-trial/start', auth(USER_ROLE.USER,USER_ROLE.MARCHANT), PaymentControllers.startFreeTrial);
router.get('/history', auth(USER_ROLE.USER), PaymentControllers.getPaymentHistory);
 
export const PaymentRoutes = router;