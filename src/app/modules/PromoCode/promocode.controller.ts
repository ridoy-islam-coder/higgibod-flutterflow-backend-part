// src/modules/promoCode/promoCode.controller.ts
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { PromoCodeService } from './promocode.service';


// ─── Admin: Create Promo Code ────────────────────────────────────────────────
const createPromoCode = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user._id;
  const result = await PromoCodeService.createPromoCode(req.body, adminId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Promo code created successfully',
    data: result,
  });
});

// ─── Admin: Get All Promo Codes ──────────────────────────────────────────────
const getAllPromoCodes = catchAsync(async (req: Request, res: Response) => {
  const result = await PromoCodeService.getAllPromoCodes();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo codes retrieved successfully',
    data: result,
  });
});

// ─── Admin: Get Single Promo Code ────────────────────────────────────────────
const getSinglePromoCode = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PromoCodeService.getSinglePromoCode(id as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code retrieved successfully',
    data: result,
  });
});

// ─── Admin: Update Promo Code ────────────────────────────────────────────────
const updatePromoCode = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PromoCodeService.updatePromoCode(id as any, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code updated successfully',
    data: result,
  });
});

// ─── Admin: Delete Promo Code ────────────────────────────────────────────────
const deletePromoCode = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PromoCodeService.deletePromoCode(id as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code deleted successfully',
    data: result,
  });
});

// ─── Admin: Toggle Active/Inactive ──────────────────────────────────────────
const togglePromoCode = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PromoCodeService.togglePromoCode(id as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Promo code ${result.isActive ? 'activated' : 'deactivated'} successfully`,
    data: result,
  });
});

// ─── User: Validate Promo Code (Checkout এ Apply বাটনে) ─────────────────────
const validatePromoCode = catchAsync(async (req: Request, res: Response) => {
  const { code, planId } = req.body;
  const result = await PromoCodeService.validatePromoCode(code, planId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code is valid',
    data: result,
  });
});

export const PromoCodeController = {
  createPromoCode,
  getAllPromoCodes,
  getSinglePromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
  validatePromoCode,
};