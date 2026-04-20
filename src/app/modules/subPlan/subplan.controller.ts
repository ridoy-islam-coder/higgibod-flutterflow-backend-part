// src/modules/subscription/subscriptionPlan.controller.ts
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { SubscriptionPlanService } from './subplan.service';


// ─── Admin: Create Plan ──────────────────────────────────────────────────────
const createPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.createPlan(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Subscription plan created successfully',
    data: result,
  });
});

// ─── Admin: Get All Plans ────────────────────────────────────────────────────
const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.getAllPlans();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All subscription plans retrieved successfully',
    data: result,
  });
});

// ─── User + Admin: Get Active Plans ─────────────────────────────────────────
const getActivePlans = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.getActivePlans();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Active subscription plans retrieved successfully',
    data: result,
  });
});

// ─── Admin: Get Single Plan ──────────────────────────────────────────────────
const getSinglePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionPlanService.getSinglePlan(id as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription plan retrieved successfully',
    data: result,
  });
});

// ─── Admin: Update Plan ──────────────────────────────────────────────────────
const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionPlanService.updatePlan(id as any, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription plan updated successfully',
    data: result,
  });
});

// ─── Admin: Toggle Active/Inactive ──────────────────────────────────────────
const togglePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionPlanService.togglePlan(id as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Plan ${result.isActive ? 'activated' : 'deactivated'} successfully`,
    data: result,
  });
});

// ─── Admin: Delete Plan ──────────────────────────────────────────────────────
const deletePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionPlanService.deletePlan(id as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription plan deleted successfully',
    data: result,
  });
});

export const SubscriptionPlanController = {
  createPlan,
  getAllPlans,
  getActivePlans,
  getSinglePlan,
  updatePlan,
  togglePlan,
  deletePlan,
};