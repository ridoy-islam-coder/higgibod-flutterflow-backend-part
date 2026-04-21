
// // src/modules/payment/payment.routes.ts
// import express from 'express';
// import { UserRole } from '../user/user.interface';
// import auth from '../../middleware/auth.middleware';
// import { PaymentController } from './subpayment.controller';


// const router = express.Router();

// // User routes (auth লাগবে)
// router.post('/validate-promo', auth(UserRole.USER), PaymentController.validatePromo);
// router.post('/activate-trial', auth(UserRole.USER), PaymentController.activateTrial);


// router.post('/create-checkout', auth(UserRole.USER), PaymentController.createCheckout);
// router.get('/cancel', PaymentController.paymentCancel);
// router.get('/success',  PaymentController.paymentSuccess);


// // Stripe Webhook — raw body দরকার
// // router.post(
// //   '/webhook',
// //   express.raw({ type: 'application/json' }),
// //   PaymentController.stripeWebhook,
// // );

// export const PaymentRoutes = router;




import express from 'express';
import auth from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.interface';
import { PaymentController } from './subpayment.controller';

const router = express.Router();

// ─── Public Routes (Stripe redirect) ─────────────────────────────────────────
// Stripe এর success/cancel URL — auth ছাড়াই হবে
router.get('/success', PaymentController.paymentSuccess);
router.get('/cancel', PaymentController.paymentCancel);

// ─── User Routes (auth লাগবে) ─────────────────────────────────────────────────

// Step 1: Promo code validate করো
// POST { code, planId }
router.post('/validate-promo', auth(UserRole.USER), PaymentController.validatePromo);

// Step 2a: Free trial হলে এটা call করো
// POST { planId, promoCodeId, billingCycle }
router.post('/activate-trial', auth(UserRole.USER), PaymentController.activateTrial);

// Step 2b: Paid হলে এটা call করো → checkoutUrl পাবে
// POST { planId, billingCycle, promoCodeId? }
router.post('/create-checkout', auth(UserRole.USER), PaymentController.createCheckout);

// Step 3: Payment শেষে frontend থেকে confirm করতে চাইলে
// POST { sessionId }
router.post('/confirm-checkout', auth(UserRole.USER), PaymentController.confirmCheckout);

export const PaymentRoutes = router;