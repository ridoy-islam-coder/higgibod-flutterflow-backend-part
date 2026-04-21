// import httpStatus from 'http-status';
// import Stripe from 'stripe';
// import { Types } from 'mongoose';
// import AppError from '../../error/AppError';
// import SubscriptionPlan from '../subPlan/subplan.model';

// import PaymentHistory from './subpayment.model';
// import User from '../user/user.model'; // ← add করো
// import PromoCode from '../PromoCode/promocode.model';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// // ─── Checkout Session Create ──────────────────────────────────────────────────
// const createCheckoutSession = async (
//   userId: string,
//   planId: string,
//   promoCode?: string,
// ) => {
//   const plan = await SubscriptionPlan.findById(planId);
//   if (!plan || !plan.isActive) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
//   }

//   let trialDays = 0;
//   let promoCodeId: string | null = null;

//   if (promoCode) {
//     const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() });

//     if (!promo || !promo.isActive) {
//       throw new AppError(httpStatus.NOT_FOUND, 'Invalid promo code');
//     }
//     if (promo.isUsed) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Promo code already used');
//     }
//     if (promo.expiresAt && promo.expiresAt < new Date()) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Promo code has expired');
//     }
//     if (promo.plan.toString() !== planId) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Promo code is not valid for this plan');
//     }

//     trialDays = promo.trialDays;
//     promoCodeId = promo._id.toString();
//   }

//   const sessionParams: Stripe.Checkout.SessionCreateParams = {
//     mode: 'subscription',
//     payment_method_types: ['card'],
//     line_items: [
//       {
//         price: plan.stripePriceId,
//         quantity: 1,
//       },
//     ],
//     ...(trialDays > 0 && {
//       subscription_data: {
//         trial_period_days: trialDays,
//       },
//     }),
//     metadata: {
//       userId,
//       planId,
//       promoCodeId: promoCodeId ?? '',
//       trialDays: trialDays.toString(),
//     },
//     success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
//   };

//   const session = await stripe.checkout.sessions.create(sessionParams);

//   await PaymentHistory.create({
//     user: new Types.ObjectId(userId),
//     plan: new Types.ObjectId(planId),
//     promoCode: promoCodeId ? new Types.ObjectId(promoCodeId) : null,
//     stripeSessionId: session.id,
//     amount: trialDays > 0 ? 0 : plan.price,
//     currency: plan.currency ?? 'usd',
//     status: 'pending',
//     isTrial: trialDays > 0,
//     trialDays,
//   });

//   return { url: session.url };
// };

// // ─── Stripe Webhook Handler ───────────────────────────────────────────────────
// const handleStripeWebhook = async (rawBody: Buffer, signature: string) => {
//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       rawBody,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET as string,
//     );
//   } catch {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Invalid webhook signature');
//   }

//   // ── checkout.session.completed ────────────────────────────────────────────
//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object as Stripe.Checkout.Session;
//     const { userId, planId, promoCodeId, trialDays } = session.metadata!;
//     const isTrial = Number(trialDays) > 0;

//     // ── Subscription details Stripe থেকে নাও ──
//     const stripeSubscription = await stripe.subscriptions.retrieve(
//       session.subscription as string,
//     );

//     const startsAt = new Date(stripeSubscription.start_date * 1000);
//     const expiresAt = new Date(stripeSubscription.current_period_end * 1000);
//     const trialEndsAt = stripeSubscription.trial_end
//       ? new Date(stripeSubscription.trial_end * 1000)
//       : null;

//     // ── PaymentHistory update ──
//     await PaymentHistory.findOneAndUpdate(
//       { stripeSessionId: session.id },
//       {
//         status: 'succeeded',
//         stripeSubscriptionId: session.subscription as string,
//         paidAt: new Date(),
//         amount: session.amount_total ?? 0,
//       },
//     );

//     // ── Promo code mark as used ──
//     if (promoCodeId) {
//       await PromoCode.findOneAndUpdate(
//         {
//           _id: new Types.ObjectId(promoCodeId),
//           isUsed: false,
//         },
//         {
//           isUsed: true,
//           usedBy: new Types.ObjectId(userId),
//         },
//       );
//     }

//     // ── User subscription update ──
//     await User.findByIdAndUpdate(userId, {
//       subscription: {
//         plan: new Types.ObjectId(planId),
//         stripeCustomerId: session.customer as string,
//         stripeSubscriptionId: session.subscription as string,
//         startsAt,
//         expiresAt,
//         trialEndsAt: trialEndsAt ?? undefined,
//         promoCodeUsed: promoCodeId ? new Types.ObjectId(promoCodeId) : undefined,
//         // Trial হলে 'trialing', না হলে 'active'
//         status: isTrial ? 'trialing' : 'active',
//       },
//     });
//   }

//   // ── customer.subscription.updated (trial শেষে active হলে) ────────────────
//   if (event.type === 'customer.subscription.updated') {
//     const subscription = event.data.object as Stripe.Subscription;

//     // Trial শেষে active হয়েছে
//     if (subscription.status === 'active') {
//       await User.findOneAndUpdate(
//         { 'subscription.stripeSubscriptionId': subscription.id },
//         {
//           'subscription.status': 'active',
//           'subscription.expiresAt': new Date(
//             subscription.current_period_end * 1000,
//           ),
//           'subscription.trialEndsAt': undefined,
//         },
//       );

//       await PaymentHistory.findOneAndUpdate(
//         { stripeSubscriptionId: subscription.id },
//         {
//           status: 'succeeded',
//           paidAt: new Date(),
//         },
//       );
//     }

//     // Subscription cancel হয়েছে
//     if (subscription.status === 'canceled') {
//       await User.findOneAndUpdate(
//         { 'subscription.stripeSubscriptionId': subscription.id },
//         { 'subscription.status': 'cancelled' },
//       );
//     }
//   }

//   // ── invoice.payment_failed ────────────────────────────────────────────────
//   if (event.type === 'invoice.payment_failed') {
//     const invoice = event.data.object as Stripe.Invoice;

//     await User.findOneAndUpdate(
//       { 'subscription.stripeSubscriptionId': invoice.subscription },
//       { 'subscription.status': 'expired' },
//     );

//     await PaymentHistory.findOneAndUpdate(
//       { stripeSubscriptionId: invoice.subscription },
//       { status: 'failed' },
//     );
//   }

//   return { received: true };
// };

// // ─── Export ───────────────────────────────────────────────────────────────────
// export const PaymentService = {
//   createCheckoutSession,
//   handleStripeWebhook,
// };


import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './subpayment.service';


// ─── Checkout Session Create ──────────────────────────────────────────────────
const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { planId, promoCode } = req.body;

  const result = await PaymentService.createCheckoutSession(
    userId,
    planId,
    promoCode,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session created successfully',
    data: result,
  });
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  try {
    await PaymentService.handleStripeWebhook(req.body, signature);
    res.status(200).json({ received: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── Get My Payment History ───────────────────────────────────────────────────
const getMyPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;

  const result = await PaymentService.getMyPaymentHistory(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment history fetched successfully',
    data: result,
  });
});

// ─── Admin: Get All Payment History ──────────────────────────────────────────
const getAllPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPaymentHistory();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All payment history fetched successfully',
    data: result,
  });
});

// ─── Cancel Subscription ──────────────────────────────────────────────────────
const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;

  const result = await PaymentService.cancelSubscription(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription cancelled successfully',
    data: result,
  });
});

// ─── Export ───────────────────────────────────────────────────────────────────
export const PaymentController = {
  createCheckoutSession,
  stripeWebhook,
  getMyPaymentHistory,
  getAllPaymentHistory,
  cancelSubscription,
};