import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

import httpStatus from 'http-status';
import { paymentServices } from './subpayment.service';

// STEP 4b ─ Start Free Trial
const startFreeTrial = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const result = await paymentServices.startFreeTrial(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '30-day free trial started successfully.',
    data: result,
  });
});

// STEP 5 ─ Checkout
const checkout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const result = await paymentServices.checkout(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment successful! Subscription activated.',
    data: result,
  });
});

// Get Payment History
const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const result = await paymentServices.getPaymentHistory(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment history retrieved successfully.',
    data: result,
  });
});

export const PaymentControllers = {
  startFreeTrial,
  checkout,
  getPaymentHistory,
};