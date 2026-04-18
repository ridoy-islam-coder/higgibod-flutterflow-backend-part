import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { authServices } from "../auth/user.service";
import  httpStatus  from 'http-status';
import sendResponse from "../../utils/sendResponse";

// Register + Merchant Profile একসাথে
const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authServices.register(req.body);
 
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
 
export const AuthControllers = {
  register,
  // login,
};
 