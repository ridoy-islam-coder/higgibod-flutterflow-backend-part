
// src/modules/payment/payment.routes.ts
import express from 'express';
import { UserRole } from '../user/user.interface';
import auth from '../../middleware/auth.middleware';
import { PaymentController } from './subpayment.controller';


const router = express.Router();

// User routes (auth লাগবে)
router.post('/validate-promo', auth(UserRole.USER), PaymentController.validatePromo);
router.post('/activate-trial', auth(UserRole.USER), PaymentController.activateTrial);
router.post('/create-intent', auth(UserRole.USER), PaymentController.createPaymentIntent);
router.post('/confirm', auth(UserRole.USER), PaymentController.confirmPayment);
router.post('/create-checkout', auth(UserRole.USER), PaymentController.createCheckout);

// Stripe Webhook — raw body দরকার
// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   PaymentController.stripeWebhook,
// );

export const PaymentRoutes = router;