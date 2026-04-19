import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";

import  httpStatus  from 'http-status';
import sendResponse from "../../utils/sendResponse";
import { sosalServices } from "./social.service";

// Register + Merchant Profile একসাথে
const register = catchAsync(async (req: Request, res: Response) => {
  const result = await sosalServices.register(req.body);
    console.log("🚀 ~ file: social.controller.ts:17 ~ register ~ result:", result)
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Registration completed successfully.',
    data: result,
  });
});
 
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

 
export const socialControllers = {
  register,
  updateProfile,
  getProfile,
  // login,
};
 