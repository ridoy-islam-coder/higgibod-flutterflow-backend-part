// order.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { orderService } from "./userOrder.service";



const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.createOrder(req.user._id);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order created successfully",
    data: result,
  });
});


// Stripe webhook — raw body lagbe, JSON parse korba na

// const stripeWebhook = async (req: Request, res: Response) => {
//   try {
//     const signature = req.headers["stripe-signature"] as string;
//     const result = await orderService.handleStripeWebhook(req.body, signature);
//     res.status(200).json(result);
//   } catch (error: any) {
//     res.status(400).json({ error: error.message });
//   }
// };


const getOrderHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.getOrderHistory(
    req.user._id,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order history fetched",
    data: result,
  });
});


const getOrderDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.getOrderDetails(
    req.params.id as string,
    req.user._id
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order details fetched",
    data: result,
  });
});


const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.cancelOrder(req.params.id as string, req.user._id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});


export const orderController = {
  createOrder,
  // stripeWebhook,
  getOrderHistory,
  getOrderDetails,
  cancelOrder,
};