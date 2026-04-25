
// personalization.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { personalizationService } from "./Personalization.service";
import { uploadToS3 } from "../../utils/fileHelper";
import httpStatus  from 'http-status';


 
 
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
 
 
 
 

 






const updatePersonalization = catchAsync(async (req: Request, res: Response) => {
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

//GEL  Personalization er data dekhte ─────────────────────────

const getPersonalization = catchAsync(async (req: Request, res: Response) => {
  const result = await personalizationService.getPersonalizationByUser(
    req.user._id
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Personalization fetched successfully",
    data: result,
  });
});




const updateProfile = catchAsync(async (req: Request, res: Response) => {
  let image;

  // 1️⃣ Upload image if provided
  if (req.file) {
    image = await uploadToS3(req.file, "profile/");
  }

  // 2️⃣ ONLY FROM TOKEN (SECURE)
  const userId = req.user._id;

  // 3️⃣ Build update data
  const updateData: Record<string, any> = {
    ...req.body,
    ...(image && { image }),
  };

  // 4️⃣ Remove forbidden fields (security)
  const forbiddenFields = ["role", "isVerified"];
  forbiddenFields.forEach((key) => delete updateData[key]);

  // 5️⃣ Call service (User + Personalization update)
  const result =
    await personalizationService.updateProfileWithPersonalization(
      userId,
      updateData,
      image
    );

  // 6️⃣ Response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});










//new update api 

// Token দিয়ে call করবে — create না থাকলে create, থাকলে update (upsert)

// ── POST/PATCH  /api/v1/personalization  ─────────────────────────────────────
const upsertPersonalization = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;
 
  const result = await personalizationService.upsertPersonalization(
    userId,
    req.body
  );
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Personalization saved successfully",
    data: result,
  });
});












export const personalizationController = {
  savePersonalization,
  getPersonalization,
  updatePersonalization,
  updateProfile,

};