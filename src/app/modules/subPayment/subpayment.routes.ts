import express from 'express';
import { PaymentController } from './subpayment.controller';
import auth from '../../middleware/auth.middleware';
import { ro } from 'date-fns/locale';
import { USER_ROLE } from '../user/user.constant';

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
router.post(
  '/checkout',
  auth(USER_ROLE.USER),
  PaymentController.createCheckoutSession,
);
router.get(
  '/history',
  auth(
    USER_ROLE.admin,
    USER_ROLE.MARCHANT,
    USER_ROLE.KAATEDJ,
    USER_ROLE.ORGANIZER,
    USER_ROLE.USER,
  ),
  PaymentController.getMyPaymentHistory,
);
// router.post('/cancel', auth(USER_ROLE.USER), PaymentController.cancelSubscription);

// ─── Admin Routes ──────────────────────────────────────────────────────────────
router.get(
  '/all-history',
  auth(
    USER_ROLE.admin,
    USER_ROLE.MARCHANT,
    USER_ROLE.KAATEDJ,
    USER_ROLE.ORGANIZER,
    USER_ROLE.USER,
  ),
  PaymentController.getAllPaymentHistory,
);

// Checkout
router.post(
  '/create-checkout',
  auth(),
  PaymentController.createCheckoutSession,
);

router.patch(
  '/cancel-trial',
  auth(
    USER_ROLE.admin,
    USER_ROLE.MARCHANT,
    USER_ROLE.KAATEDJ,
    USER_ROLE.ORGANIZER,
    USER_ROLE.USER,
  ),
  PaymentController.cancelTrial,
);

router.get(
  '/my-subscription',
  auth(
    USER_ROLE.admin,
    USER_ROLE.MARCHANT,
    USER_ROLE.KAATEDJ,
    USER_ROLE.ORGANIZER,
    USER_ROLE.USER,
  ),
  PaymentController.getMySubscription,
);

router.get('/success', PaymentController.paymentSuccess);

router.get('/cancel', PaymentController.paymentCancel);

export const PaymentRoutes = router;
