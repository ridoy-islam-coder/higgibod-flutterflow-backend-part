import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";

import  httpStatus  from 'http-status';
import sendResponse from "../../utils/sendResponse";
import { sosalServices } from "./social.service";
import AppError from "../../error/AppError";

// Register + Merchant Profile একসাথে
// const register = catchAsync(async (req: Request, res: Response) => {
//   const result = await sosalServices.register(req.body);
//     console.log("🚀 ~ file: social.controller.ts:17 ~ register ~ result:", result)
//   sendResponse(res, {
//     statusCode: httpStatus.CREATED,
//     success: true,
//     message: 'Registration completed successfully.',
//     data: result,
//   });
// });
 
// Login
// const login = catchAsync(async (req: Request, res: Response) => {
//   const result = await authServices.login(req.body);
 
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Login successful',
//     data: result,
//   });
// });


const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await sosalServices.updateProfile(
    req.user,
    req.body,          // form-data er text fields
    req.files as Record<string, Express.Multer.File[]>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});




const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await sosalServices.getProfile(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: result,
  });
});








export const register = catchAsync(async (req: Request, res: Response) => {


  //  Service call (ALL DATA + IMAGE)
  const result = await sosalServices.register({
    ...req.body,

    // 🔥 image file
    file: req.file,

    // 🔥 social fields explicitly (optional but safe)
    shopName: req.body.shopName,
    shoptype: req.body.shoptype,
    facebook: req.body.facebook,
    instagram: req.body.instagram,
    linkedin: req.body.linkedin,
    twitter: req.body.twitter,
    youtube: req.body.youtube,
    tiktok: req.body.tiktok,
    website: req.body.website,
    shoplink: req.body.shoplink,
  });

  //  Response
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Registration completed successfully.',
    data: result,
  });
});



// export const register = catchAsync(async (req: Request, res: Response) => {
//   if (!req.body.data) {
//     throw new AppError(httpStatus.BAD_REQUEST, "data field is required");
//   }

//   let body;
//   try {
//     body = JSON.parse(req.body.data);
//   } catch (error) {
//     throw new AppError(httpStatus.BAD_REQUEST, "Invalid JSON in data field");
//   }

//   const result = await sosalServices.register({
//     ...body,
//     file: req.file,
//   });

//   sendResponse(res, {
//     statusCode: httpStatus.CREATED,
//     success: true,
//     message: "Registration completed successfully.",
//     data: result,
//   });
// });






 
export const socialControllers = {
  register,
  updateProfile,
  getProfile,
  // login,
};
 