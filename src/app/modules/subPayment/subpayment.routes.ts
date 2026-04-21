
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



// import express, { Router } from 'express';
// import { UserRole } from '../user/user.interface';
// import auth from '../../middleware/auth.middleware';
// import { PaymentController } from './subpayment.controller';
// import { ro } from 'date-fns/locale';

// const router = Router();

// // ─── Stripe Webhook (raw body দরকার, auth লাগবে না) ──────────────────────────
// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   PaymentController.stripeWebhook,
// );

// // ─── User Routes ──────────────────────────────────────────────────────────────
// router.post('/create-checkout', auth(UserRole.USER), PaymentController.createCheckoutSession);
// router.get('/my-subscription', auth(UserRole.USER), PaymentController.getMySubscription);
// router.patch('/cancel-trial', auth(UserRole.USER), PaymentController.cancelTrial);
// router.patch('/choose-plan', auth(UserRole.USER), PaymentController.chooseAnotherPlan);
// router.get('/success', PaymentController.paymentSuccess);
// export const PaymentRoutes = router;


import express from 'express';
import { PaymentController } from './subpayment.controller';
import auth from '../../middleware/auth.middleware';


const router = express.Router();

// Webhook — raw body লাগবে, তাই আলাদা middleware
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.stripeWebhook,
);

// Checkout
router.post(
  '/create-checkout',
  auth(),
  PaymentController.createCheckoutSession,
);

export const PaymentRoutes = router;