
// order.service.ts

import config from "../../config";
import AppError from "../../error/AppError";
import { Cart } from "../addtocard/addtotocard.model";
import { Product } from "../product/product.model";
import User from "../user/user.model";
import { Order } from "./userOrder.model";
import Stripe from 'stripe';

 
const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// ─── 1. Create Order + Stripe Payment Intent ───────────────────────────────


// const createOrder = async (userId: string) => {
//   // Get user profile for shipping address
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");
 
//   // if (
//   //   !user.address?.address ||
//   //   !user.address?.city ||
//   //   !user.address?.country
//   // ) {
//   //   throw new Error(
//   //     "Please complete your shipping address in profile before placing order"
//   //   );
//   // }
 
//   // Get user cart
//   const cart = await Cart.findOne({ user: userId }).populate("items.product");
//   if (!cart || cart.items.length === 0) throw new Error("Cart is empty");
 
//   // Build order items with current product prices
//   let subtotal = 0;
//   let totalShipping = 0;
//   let totalTax = 0;
 
//   const orderItems = cart.items.map((item: any) => {
//     const product = item.product;
//     const discountedPrice =
//       product.price - (product.price * (product.discount || 0)) / 100;
 
//     subtotal += discountedPrice * item.quantity;
//     totalShipping += product.shippingCost || 0;
//     totalTax += (discountedPrice * item.quantity * (product.tax || 0)) / 100;
 
//     return {
//       product: product._id,
//       quantity: item.quantity,
//       color: item.color || "",
//       size: item.size || "",
//       price: discountedPrice,
//     };
//   });
 
//   const total = subtotal + totalShipping + totalTax;
 
//   // Create Stripe Payment Intent
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: Math.round(total * 100), // Stripe uses cents
//     currency: "usd",
//     metadata: { userId: userId.toString() },
//   });
 
//   // Save order to DB
//   const order = await Order.create({
//     user: userId,
//     items: orderItems,
//     shippingAddress: {
//       fullName: user.name,
//       phone: user.phone || "",
//       // address: user.address.address,
//       // city: user.address.city,
//       // country: user.address.country,
//       // postalCode: user.address.postalCode || "",
//     },
//     subtotal,
//     shippingCost: totalShipping,
//     tax: totalTax,
//     total,
//     stripePaymentIntentId: paymentIntent.id,
//     stripeClientSecret: paymentIntent.client_secret,
//   });
 
//   return {
//     orderId: order._id,
//     clientSecret: paymentIntent.client_secret, // send to frontend
//     total,
//   };
// };


 
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



















//new code  

export const createOrder = async (userId: string, body: any) => {
  const { shippingAddress, cartId } = body;

  // ✅ debug log
  console.log("userId:", userId);
  console.log("cartId:", cartId);

  const cart = await Cart.findOne({
    _id: cartId,
    user: userId,
  }).populate({
    path: "items.product",
    select: "name price discountPrice shippingCost stock images",
  });

  // ✅ debug log
  console.log("cart:", JSON.stringify(cart, null, 2));

  if (!cart) throw new AppError(404, "Cart not found");
  if (cart.items.length === 0) throw new AppError(400, "Cart is empty");

  const lineItems: any[] = [];
  let totalShipping = 0;
  let subtotal = 0;
  const orderItemsSnapshot: any[] = [];

  for (const item of cart.items as any[]) {
    const product = item.product;

    // ✅ debug log
    console.log("item:", JSON.stringify(item, null, 2));
    console.log("product:", product);

    if (!product) throw new AppError(404, `Product not found`);

    if (product.stock < item.quantity)
      throw new AppError(400, `${product.name} is out of stock`);

    const unitPrice = product.discountPrice || product.price;
    subtotal += unitPrice * item.quantity;
    totalShipping += product.shippingCost || 0;

    orderItemsSnapshot.push({
      product: product._id,
      quantity: item.quantity,
      color: item.color,
      size: item.size,
      price: unitPrice,
    });

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: product.name,
          images: product.images?.[0]?.url ? [product.images[0].url] : [],
        },
        unit_amount: Math.round(unitPrice * 100),
      },
      quantity: item.quantity,
    });
  }

  const total = subtotal + totalShipping;

  const pendingOrder = await Order.create({
    user: userId,
    items: orderItemsSnapshot,
    shippingAddress,
    subtotal,
    shippingCost: totalShipping,
    total,
    paymentStatus: "pending",
    orderStatus: "processing",
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${config.backend_url}/order-success?orderId=${pendingOrder._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.backend_url}/cart`,
    metadata: {
      orderId: pendingOrder._id.toString(),
      userId: userId.toString(),
      cartId: cartId.toString(),
    },
    shipping_options: totalShipping > 0
      ? [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: Math.round(totalShipping * 100),
                currency: "usd",
              },
              display_name: "Standard Shipping",
            },
          },
        ]
      : [],
  });

  return {
    checkoutUrl: session.url,
    orderId: pendingOrder._id,
    sessionId: session.id,
  };
};
// // ─── 2. Stripe Webhook — payment success hole order confirm ───────────────
// const stripeWebhook = async (rawBody: Buffer, signature: string) => {
//   let stripeEvent;

//   try {
//     stripeEvent = stripe.webhooks.constructEvent(
//       rawBody,
//       signature,
//       config.stripe.webhook_secret as string,
//     );
//   } catch {
//     throw new Error('Webhook signature verification failed');
//   }

//   // Payment success
//   if (stripeEvent.type === 'checkout.session.completed') {
//     const session = stripeEvent.data.object as Stripe.Checkout.Session;
//     const orderId = session.metadata?.orderId;

//     if (orderId) {
//       await Order.findByIdAndUpdate(orderId, {
//         paymentStatus: 'paid',
//         stripeSessionId: session.id,
//       });

//       // Cart clear koro
//       const order = await Order.findById(orderId);
//       if (order) {
//         await Cart.findOneAndUpdate(
//           { user: order.user },
//           { items: [] },
//         );
//       }
//     }
//   }

//   // Payment cancel/expire
//   if (stripeEvent.type === 'checkout.session.expired') {
//     const session = stripeEvent.data.object as Stripe.Checkout.Session;
//     const orderId = session.metadata?.orderId;

//     if (orderId) {
//       await Order.findByIdAndUpdate(orderId, {
//         paymentStatus: 'failed',
//       });
//     }
//   }

//   return { received: true };
// };







 
export const orderService = {
  createOrder,
//   handleStripeWebhook,
  getOrderHistory,
  getOrderDetails,
  cancelOrder,
};