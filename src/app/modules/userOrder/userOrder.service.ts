
// order.service.ts

import config from "../../config";
import AppError from "../../error/AppError";
import { Cart } from "../addtocard/addtotocard.model";
import { Product } from "../product/product.model";
import User from "../user/user.model";
import { Order } from "./userOrder.model";
import Stripe from 'stripe';

 
const stripe = new Stripe(config.stripe.stripe_secret_key as string);


 
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

  const cart = await Cart.findOne({
    _id: cartId,
    user: userId,
  }).populate({
    path: "items.product",
    select: "name price discountPrice shippingCost stock images",
  });

  if (!cart) throw new AppError(404, "Cart not found");
  if (cart.items.length === 0) throw new AppError(400, "Cart is empty");

  const lineItems: any[] = [];
  let totalShipping = 0;
  let subtotal = 0;
  const orderItemsSnapshot: any[] = [];

  for (const item of cart.items as any[]) {
    const product = item.product;

    if (!product) throw new AppError(404, `Product not found`);

    if (product.stock < item.quantity)
      throw new AppError(400, `${product.name} is out of stock`);

    // ✅ discountPrice > 0 হলে discountPrice, নাহলে original price
    const unitPrice =
      product.discountPrice > 0 ? product.discountPrice : product.price;

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
    paymentStatus: "paid",
    orderStatus: "processing",
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${config.backend_url}/order/success?orderId=${pendingOrder._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.backend_url}/order/cancel`,
    metadata: {
      orderId: pendingOrder._id.toString(),
      userId: userId.toString(),
      cartId: cartId.toString(),
    },
    shipping_options:
      totalShipping > 0
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



// export const handleStripeWebhook = async (req: any) => {
//   const sig = req.headers["stripe-signature"];
//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET as string
//     );
//   } catch (err: any) {
//     throw new AppError(400, `Webhook Error: ${err.message}`);
//   }

//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object as any;
//     const orderId = session.metadata?.orderId;
//     const cartId = session.metadata?.cartId;

//     // ✅ Order paid update করো
//     await Order.findByIdAndUpdate(orderId, {
//       paymentStatus: "paid",
//       stripePaymentIntentId: session.payment_intent,
//       stripeSessionId: session.id,
//     });

//     // ✅ Cart clear করো
//     await Cart.findByIdAndUpdate(cartId, { items: [] });
//   }

//   if (event.type === "checkout.session.expired") {
//     const session = event.data.object as any;
//     const orderId = session.metadata?.orderId;

//     // ✅ Order cancel করো
//     await Order.findByIdAndUpdate(orderId, {
//       paymentStatus: "failed",
//       orderStatus: "cancelled",
//     });
//   }
// };



export const updateOrderStatus = async (orderId: string, status: string) => {
  const validStatus = ["processing", "shipped", "delivered", "cancelled"];
  if (!validStatus.includes(status))
    throw new AppError(400, "Invalid order status");

  const order = await Order.findByIdAndUpdate(
    orderId,
    { orderStatus: status },
    { new: true }
  );

  if (!order) throw new AppError(404, "Order not found");
  return order;
};



 
export const orderService = {
  createOrder,
//   handleStripeWebhook,
  getOrderHistory,
  getOrderDetails,
  cancelOrder,
  updateOrderStatus,
  
};