
// personalization.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { personalizationService } from "./Personalization.service";

 
 
const savePersonalization = catchAsync(async (req: Request, res: Response) => {
  const { interests, skillLevel, yearsSkating } = req.body;
  const result = await personalizationService.savePersonalization(
    req.user._id,
    { interests, skillLevel, yearsSkating }
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Personalization saved",
    data: result,
  });
});
 
 
const completePersonalization = catchAsync(
  async (req: Request, res: Response) => {
    const result = await personalizationService.completePersonalization(
      req.user._id
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Personalization completed",
      data: result,
    });
  }
);
 
 
const getPersonalization = catchAsync(async (req: Request, res: Response) => {
  const result = await personalizationService.getPersonalization(req.user._id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Personalization fetched",
    data: result,
  });
});
 
 
const checkPersonalizationStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result = await personalizationService.isPersonalizationCompleted(
      req.user._id
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Personalization status fetched",
      data: result,
    });
  }
);
 
 
export const personalizationController = {
  savePersonalization,
  completePersonalization,
  getPersonalization,
  checkPersonalizationStatus,
};