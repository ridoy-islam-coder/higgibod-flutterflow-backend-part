// order.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { orderService } from "./userOrder.service";
import { generateCancelHTML, generateSuccessHTML } from "../../utils/orderPage.helper";
 import Stripe from 'stripe';
import config from "../../config";
import { Order } from "./userOrder.model";
import  httpStatus from 'http-status';
import { uploadToS3 } from "../../utils/fileHelper";
const stripe = new Stripe(config.stripe.stripe_secret_key as string);


const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.createOrder(req.user._id, req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order created successfully",
    data: result,
  });
});

// const createOrder = catchAsync(async (req: Request, res: Response) => {
//   let fileUrl = '';

//   // ✅ file আসলে S3-তে upload করো
//   if (req.file) {
//     const uploaded = await uploadToS3(req.file, 'orders/shipping');
//     fileUrl = uploaded.url;
//   }

//   // ✅ FormData থেকে shippingAddress parse করো
//   const shippingAddress = req.body.shippingAddress
//     ? JSON.parse(req.body.shippingAddress)
//     : {};

//   const body = {
//     cartId: req.body.cartId,
//     shippingAddress: {
//       ...shippingAddress,
//       file: fileUrl, // ✅ S3 URL inject
//     },
//   };

//   const result = await orderService.createOrder(req.user._id, body);

//   sendResponse(res, {
//     statusCode: 201,
//     success: true,
//     message: 'Order created successfully',
//     data: result,
//   });
// });




const getOrderHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.getOrderHistory(
    req.user._id,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
    req.query.orderStatus as string, // ✅ নতুন
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



// GET /api/orders/order-success
export const orderSuccessPage = catchAsync(async (req, res) => {
  const { orderId, session_id } = req.query;

  const order = await Order.findById(orderId).populate({
    path: "items.product",
    select: "name images price discountPrice",
  });

  if (!order) {
    return res.send(generateCancelHTML("Order not found."));
  }

  const session = await stripe.checkout.sessions.retrieve(session_id as string);
  if (session.payment_status !== "paid") {
    return res.send(generateCancelHTML("Payment not completed."));
  }

  res.send(generateSuccessHTML(order));
});



// GET /api/orders/cart
export const orderCancelPage = catchAsync(async (req, res) => {
  res.send(generateCancelHTML(" payment cancel"));
});





export const updateOrderStatus = catchAsync(async (req, res) => {
  const result = await orderService.updateOrderStatus(
    req.params.orderId as string,
    req.body.orderStatus
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status updated",
    data: result,
  });
});





const getMyProductOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { orderStatus, page, limit } = req.query;

  const result = await orderService.getMyProductOrders(
    userId,
    orderStatus as string | undefined,
    Number(page) || 1,
    Number(limit) || 10,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your product orders fetched successfully',
    data: result,
  });
});

export const orderController = {
  createOrder,
  // stripeWebhook,
  getOrderHistory,
  getOrderDetails,
  orderCancelPage,
  orderSuccessPage,
  updateOrderStatus,
  getMyProductOrders,
};