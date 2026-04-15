



// order.routes.ts
import { Router } from "express";
import { USER_ROLE } from "../user/user.constant";
import auth from "../../middleware/auth.middleware";
import { orderController } from "./userOrder.controller";

 
const router = Router();
 
// ⚠️ Webhook route — MUST be before express.json() middleware
// raw body lagbe Stripe signature verify korar jonno
// app.ts e ei route ta express.json() er UPORE register korte hobe

// router.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   orderController.stripeWebhook
// );
 
// POST /orders — cart theke order create + stripe payment intent
router.post("/create-orders", auth(USER_ROLE.USER), orderController.createOrder);
 
// GET /orders — order history
router.get("/order-history", auth(USER_ROLE.USER), orderController.getOrderHistory);
 
// GET /orders/:id — single order details
router.get("/order-details/:id", auth(USER_ROLE.USER), orderController.getOrderDetails);
 
// PATCH /orders/:id/cancel — order cancel
router.patch("/cancel/:id", auth(USER_ROLE.USER), orderController.cancelOrder);
 
export const orderRoutes = router;