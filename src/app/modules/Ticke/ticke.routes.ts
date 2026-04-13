

// ticket.routes.ts
import { Router } from "express";

import { USER_ROLE } from "../user/user.constant";
import auth from "../../middleware/auth.middleware";
import { ticketController } from "./ticke.controller";

 
const router = Router();
 
// ⚠️ Webhook MUST be first — raw body lagbe

// router.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   ticketController.ticketWebhook
// );
 
// POST  /tickets/buy/:eventId     — event er ticket kino + clientSecret return
// body: { quantity: 1, ticketType: "General" | "VIP" | "VVIP" }
router.post("/buy/:eventId", auth(USER_ROLE.USER), ticketController.buyTicket);
 
// GET   /tickets/my-tickets       — My Tickets screen
router.get("/my-tickets", auth(USER_ROLE.USER), ticketController.getMyTickets);
 
// GET   /tickets/:id              — single ticket details
router.get("/:id", auth(USER_ROLE.USER), ticketController.getTicketDetails);
 
// GET   /tickets/:id/qr           — QR Code screen
router.get("/:id/qr", auth(USER_ROLE.USER), ticketController.getTicketQRCode);
 
// POST  /tickets/scan             — entry scanner (organizer use korbe)
// body: { ticketNumber: "TKT-xxx-xxx" }
router.post("/scan", auth(USER_ROLE.USER), ticketController.scanTicket);
 
export const ticketRoutes = router;