
// order.service.ts

import { Cart } from "../addtocard/addtotocard.model";
import { Product } from "../product/product.model";
import User from "../user/user.model";
import { Order } from "./userOrder.model";
import Stripe from 'stripe';

 
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
 
// ─── 1. Create Order + Stripe Payment Intent ───────────────────────────────
const createOrder = async (userId: string) => {
  // Get user profile for shipping address
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
 
  if (
    !user.address?.address ||
    !user.address?.city ||
    !user.address?.country
  ) {
    throw new Error(
      "Please complete your shipping address in profile before placing order"
    );
  }
 
  // Get user cart
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");
 
  // Build order items with current product prices
  let subtotal = 0;
  let totalShipping = 0;
  let totalTax = 0;
 
  const orderItems = cart.items.map((item: any) => {
    const product = item.product;
    const discountedPrice =
      product.price - (product.price * (product.discount || 0)) / 100;
 
    subtotal += discountedPrice * item.quantity;
    totalShipping += product.shippingCost || 0;
    totalTax += (discountedPrice * item.quantity * (product.tax || 0)) / 100;
 
    return {
      product: product._id,
      quantity: item.quantity,
      color: item.color || "",
      size: item.size || "",
      price: discountedPrice,
    };
  });
 
  const total = subtotal + totalShipping + totalTax;
 
  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100), // Stripe uses cents
    currency: "usd",
    metadata: { userId: userId.toString() },
  });
 
  // Save order to DB
  const order = await Order.create({
    user: userId,
    items: orderItems,
    shippingAddress: {
      fullName: user.name,
      phone: user.phone || "",
      address: user.address.address,
      city: user.address.city,
      country: user.address.country,
      postalCode: user.address.postalCode || "",
    },
    subtotal,
    shippingCost: totalShipping,
    tax: totalTax,
    total,
    stripePaymentIntentId: paymentIntent.id,
    stripeClientSecret: paymentIntent.client_secret,
  });
 
  return {
    orderId: order._id,
    clientSecret: paymentIntent.client_secret, // send to frontend
    total,
  };
};


 
// ─── 2. Stripe Webhook — payment confirm hoile call hobe ──────────────────



// const handleStripeWebhook = async (
//   rawBody: Buffer,
//   signature: string
// ) => {
//   let event: Stripe.Event ;
 
//   try {
//     event = stripe.webhooks.constructEvent(
//       rawBody,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET as string
//     );
//   } catch {
//     throw new Error("Webhook signature verification failed");
//   }
 
//   if (event.type === "payment_intent.succeeded") {
//     const paymentIntent = event.data.object as Stripe.PaymentIntent;
 
//     // Update order status to paid
//     await Order.findOneAndUpdate(
//       { stripePaymentIntentId: paymentIntent.id },
//       { paymentStatus: "paid" }
//     );
 
//     // Clear user cart after successful payment
//     const order = await Order.findOne({
//       stripePaymentIntentId: paymentIntent.id,
//     });
//     if (order) {
//       await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
//     }
//   }
 
//   if (event.type === "payment_intent.payment_failed") {
//     const paymentIntent = event.data.object as Stripe.PaymentIntent;
//     await Order.findOneAndUpdate(
//       { stripePaymentIntentId: paymentIntent.id },
//       { paymentStatus: "failed" }
//     );
//   }
 
//   return { received: true };
// };
 
// ─── 3. Get Order History ──────────────────────────────────────────────────
const getOrderHistory = async (
  userId: string,
  page = 1,
  limit = 10
) => {
  const skip = (page - 1) * limit;
  const total = await Order.countDocuments({ user: userId, isDeleted: false });
 
  const orders = await Order.find({ user: userId })
    .populate("items.product", "name images price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
 
  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
 
// ─── 4. Get Single Order Details ──────────────────────────────────────────
const getOrderDetails = async (orderId: string, userId: string) => {
  const order = await Order.findOne({ _id: orderId, user: userId }).populate(
    "items.product",
    "name images price category"
  );
  if (!order) throw new Error("Order not found");
  return order;
};
 
// ─── 5. Cancel Order ──────────────────────────────────────────────────────
const cancelOrder = async (orderId: string, userId: string) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error("Order not found");
 
  if (order.orderStatus !== "processing") {
    throw new Error("Only processing orders can be cancelled");
  }
 
  // Refund via Stripe if already paid
  if (order.paymentStatus === "paid" && order.stripePaymentIntentId) {
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
    });
    order.paymentStatus = "refunded";
  }
 
  order.orderStatus = "cancelled";
  await order.save();
  return order;
};
 
export const orderService = {
  createOrder,
//   handleStripeWebhook,
  getOrderHistory,
  getOrderDetails,
  cancelOrder,
};