import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { planServices } from "./subplan.service";


// Create
const createPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await planServices.createPlan(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Plan created successfully.",
    data: result,
  });
});

// Get All
const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await planServices.getAllPlans();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plans retrieved successfully.",
    data: result,
  });
});

// Get Single
const getSinglePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await planServices.getSinglePlan(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plan retrieved successfully.",
    data: result,
  });
});

// Update
const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await planServices.updatePlan(id as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plan updated successfully.",
    data: result,
  });
});

// Delete
const deletePlan = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await planServices.deletePlan(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plan deleted successfully.",
    data: result,
  });
});

export const planControllers = {
  createPlan,
  getAllPlans,
  getSinglePlan,
  updatePlan,
  deletePlan,
};