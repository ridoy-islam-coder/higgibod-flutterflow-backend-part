

import express from 'express';
import { PaymentController } from './subpayment.controller';
import auth from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.interface';
import { ro } from 'date-fns/locale';


const router = express.Router();




// ─── Public (Stripe webhook — auth লাগবে না) ──────────────────────────────────
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), 
  PaymentController.stripeWebhook,
);

// ─── Payment Success Page (Stripe redirect) ────────────────────────────────────
router.get('/subscription', PaymentController.paymentSuccess);

// ─── User Routes ───────────────────────────────────────────────────────────────
router.post('/checkout', auth(UserRole.USER), PaymentController.createCheckoutSession);
router.get('/history', auth(UserRole.USER), PaymentController.getMyPaymentHistory);
// router.post('/cancel', auth(UserRole.USER), PaymentController.cancelSubscription);

// ─── Admin Routes ──────────────────────────────────────────────────────────────
router.get('/all-history', auth(UserRole.admin), PaymentController.getAllPaymentHistory);

// Checkout
router.post(
  '/create-checkout',
  auth(),
  PaymentController.createCheckoutSession,
);



router.get('/success', PaymentController.paymentSuccess);

router.get('/cancel', PaymentController.paymentCancel);

export const PaymentRoutes = router;