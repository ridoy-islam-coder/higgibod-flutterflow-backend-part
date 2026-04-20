// src/modules/payment/payment.controller.ts
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { PromoCodeService } from '../PromoCode/promocode.service';
import { PaymentService } from './subpayment.service';


// Promo code validate করো (checkout এ apply বাটনে)
const validatePromo = catchAsync(async (req: Request, res: Response) => {
  const { code, planId } = req.body;
  const result = await PromoCodeService.validatePromoCode(code, planId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code validated',
    data: result,
  });
});

// Free trial activate (promo = 100% free)
const activateTrial = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { planId, promoCodeId, trialDays } = req.body;

  const result = await PaymentService.activateFreeTrial(
    userId, planId, promoCodeId, trialDays,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

// Stripe Payment Intent তৈরি করো
const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { planId, promoCodeId } = req.body;

  const result = await PaymentService.createPaymentIntent(
    userId, planId, promoCodeId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment intent created',
    data: result,
  });
});

// Payment confirm করো
const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { planId, paymentIntentId, promoCodeId } = req.body;

  const result = await PaymentService.confirmPaymentAndActivate(
    userId, planId, paymentIntentId, promoCodeId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});



// Stripe Webhook
// const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
//   const signature = req.headers['stripe-signature'] as string;
//   const result = await PaymentService.handleStripeWebhook(req.body, signature);
//   res.json(result);
// });

export const PaymentController = {
  validatePromo,
  activateTrial,
  createPaymentIntent,
  confirmPayment,
//   stripeWebhook,
};