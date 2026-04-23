
// order.service.ts

import config from "../../config";
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


// ─── 1. Create Order + Stripe Checkout Session ────────────────────────────
const createOrder = async (userId: string) => {
  // Get user profile for shipping address
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Get user cart
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new Error('Cart is empty');

  // Build order items with current product prices (tomar logic same)
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
      color: item.color || '',
      size: item.size || '',
      price: discountedPrice,
    };
  });

  const total = subtotal + totalShipping + totalTax;

  // Save order to DB — pending status (tomar existing fields same)
  const order = await Order.create({
    user: userId,
    items: orderItems,
    shippingAddress: {
      fullName: user.name,
      phone: user.phone || '',
      // address: user.address.address,
      // city: user.address.city,
      // country: user.address.country,
      // postalCode: user.address.postalCode || "",
    },
    subtotal,
    shippingCost: totalShipping,
    tax: totalTax,
    total,
    paymentStatus: 'pending',
  });

  // Stripe Checkout line_items — cart items theke build koro
  const lineItems = cart.items.map((item: any) => {
    const product = item.product;
    const discountedPrice =
      product.price - (product.price * (product.discount || 0)) / 100;

    return {
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(discountedPrice * 100), // cents
        product_data: {
          name: product.name,
          description: [item.color, item.size].filter(Boolean).join(' | ') || undefined,
          ...(product.images?.[0] && { images: [product.images[0]] }),
        },
      },
    };
  });

  // Stripe Checkout Session create
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email,
    line_items: lineItems,

    // Shipping + tax breakdown show korbe checkout page e
    shipping_options: totalShipping > 0
      ? [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              display_name: 'Standard Shipping',
              fixed_amount: {
                amount: Math.round(totalShipping * 100),
                currency: 'usd',
              },
            },
          },
        ]
      : [],

    metadata: {
      orderId: order._id.toString(), // webhook e use korbo
      userId: userId.toString(),
    },

    success_url: `${config.backend_url}/payment/success?orderId=${order._id}`,
    cancel_url: `${config.backend_url}/payment/cancel?orderId=${order._id}`,
  });

  // Session id order e save koro
  await Order.findByIdAndUpdate(order._id, {
    stripeSessionId: session.id,
  });

  return {
    orderId: order._id,
    checkoutUrl: session.url, // ← frontend redirect korbe ei url e
    total,
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