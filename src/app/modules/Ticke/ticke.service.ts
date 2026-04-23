// ticket.service.ts
import Stripe from "stripe";
import QRCode from "qrcode";

import { Event } from "../event/event.model";
import User from "../user/user.model";
import { Ticket } from "./ticke.model";
import config from "../../config";


const stripe = new Stripe(config.stripe.stripe_secret_key as string)
// ─── Unique ticket number generate ────────────────────────────────────────
const generateTicketNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
};

// // ─── 1. Buy Ticket — Stripe Payment Intent create ─────────────────────────
// const buyTicket = async (
//   userId: string,
//   eventId: string,
//   quantity: number = 1,
//   ticketType: string = "General"
// ) => {
//   // User info
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");

//   // Event info
//   const event = await Event.findById(eventId);
//   if (!event) throw new Error("Event not found");

//   if (event.isPast) throw new Error("This event has already passed");

//   const pricePerTicket = event.price || 0;
//   const totalAmount = pricePerTicket * quantity;

//   // Stripe Payment Intent create
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: Math.round(totalAmount * 100), // cents
//     currency: "usd",
//     metadata: {
//       userId: userId.toString(),
//       eventId: eventId.toString(),
//       quantity: quantity.toString(),
//     },
//   });

//   // Ticket DB te save koro — pending status
//   const ticket = await Ticket.create({
//     user: userId,
//     event: eventId,
//     ticketNumber: generateTicketNumber(),
//     attendeeName: user.name,
//     attendeeEmail: user.email,
//     ticketType,
//     quantity,
//     price: pricePerTicket,
//     totalAmount,
//     paymentStatus: "pending",
//     stripePaymentIntentId: paymentIntent.id,
//   });

//   return {
//     ticketId: ticket._id,
//     ticketNumber: ticket.ticketNumber,
//     clientSecret: paymentIntent.client_secret, // frontend e pathabo
//     totalAmount,
//     event: {
//       title: event.title,
//       date: event.date,
//       time: event.time,
//       location: event.location,
//     },
//   };
// };



// ─── 2. Stripe Webhook — payment confirm hoile ticket activate ────────────



// const handleTicketWebhook = async (rawBody: Buffer, signature: string) => {
//   let event: Stripe.Event;

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

//     // Ticket status paid koro + event attendees e user add koro
//     const ticket = await Ticket.findOneAndUpdate(
//       { stripePaymentIntentId: paymentIntent.id },
//       { paymentStatus: "paid" },
//       { new: true }
//     );

//     if (ticket) {
//       // Event attendees list e user add koro
//       await Event.findByIdAndUpdate(ticket.event, {
//         $addToSet: { attendees: ticket.user },
//       });
//     }
//   }

//   if (event.type === "payment_intent.payment_failed") {
//     const paymentIntent = event.data.object as Stripe.PaymentIntent;
//     await Ticket.findOneAndUpdate(
//       { stripePaymentIntentId: paymentIntent.id },
//       { paymentStatus: "failed" }
//     );
//   }

//   return { received: true };
// };







// ─── 3. My Tickets — user er sob tickets ──────────────────────────────────
const getMyTickets = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const total = await Ticket.countDocuments({
    user: userId,
    isDeleted: false,
    paymentStatus: "paid",
  });

  const tickets = await Ticket.find({ user: userId, paymentStatus: "paid" })
    .populate("event", "title date time location coverImage category")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    tickets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── 4. Ticket Details ────────────────────────────────────────────────────
const getTicketDetails = async (ticketId: string, userId: string) => {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    user: userId,
  }).populate("event", "title date time location coverImage description host");

  if (!ticket) throw new Error("Ticket not found");
  return ticket;
};

// ─── 5. QR Code generate ──────────────────────────────────────────────────
const getTicketQRCode = async (ticketId: string, userId: string) => {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    user: userId,
    paymentStatus: "paid",
  }).populate("event", "title date location");

  if (!ticket) throw new Error("Ticket not found or payment pending");

  // QR code e ticket info encode korbo
  const qrData = JSON.stringify({
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket._id,
    event: (ticket.event as any).title,
    attendee: ticket.attendeeName,
    date: (ticket.event as any).date,
  });

  // Base64 QR image generate
  const qrCodeBase64 = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return {
    ticketNumber: ticket.ticketNumber,
    attendeeName: ticket.attendeeName,
    attendeeEmail: ticket.attendeeEmail,
    ticketType: ticket.ticketType,
    quantity: ticket.quantity,
    isUsed: ticket.isUsed,
    qrCode: qrCodeBase64, // frontend e <Image source={{ uri: qrCode }} />
    event: ticket.event,
  };
};

// ─── 6. Scan QR — entry te use korle isUsed true hobe ────────────────────
const scanTicket = async (ticketNumber: string) => {
  const ticket = await Ticket.findOne({
    ticketNumber,
    paymentStatus: "paid",
  }).populate("event", "title date location");

  if (!ticket) throw new Error("Invalid ticket");
  if (ticket.isUsed) throw new Error("Ticket already used");

  ticket.isUsed = true;
  await ticket.save();

  return {
    valid: true,
    message: "Ticket scanned successfully",
    attendeeName: ticket.attendeeName,
    ticketType: ticket.ticketType,
    event: ticket.event,
  };
};






// ─── Unique ticket number generate ────────────────────────────────────────
// const generateTicketNumber = (): string => {
//   const timestamp = Date.now().toString(36).toUpperCase();
//   const random = Math.random().toString(36).substring(2, 6).toUpperCase();
//   return `TKT-${timestamp}-${random}`;
// };

// ─── 1. Buy Ticket — Stripe Checkout Session create ───────────────────────


const buyTicket = async (
  userId: string,
  eventId: string,
  quantity: number = 1,
  ticketType: string = 'General',
) => {
  // User info
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Event info
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  if (event.isPast) throw new Error('This event has already passed');

  const pricePerTicket = event.price || 0;
  const totalAmount = pricePerTicket * quantity;

  // Ticket DB te save koro — pending status (tomar logic same)
  const ticket = await Ticket.create({
    user: userId,
    event: eventId,
    ticketNumber: generateTicketNumber(),
    attendeeName: user.name,
    attendeeEmail: user.email,
    ticketType,
    quantity,
    price: pricePerTicket,
    totalAmount,
    paymentStatus: 'paid',
  });

  // Stripe Checkout Session create
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email, // checkout e email prefill hobe

    line_items: [
      {
        quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(pricePerTicket * 100), // cents
          product_data: {
            name: event.title,
            description: `Ticket Type: ${ticketType} | Date: ${new Date(event.date).toDateString()}`,
          },
        },
      },
    ],

    metadata: {
      ticketId: ticket._id.toString(), // webhook e use korbo
      userId: userId.toString(),
      eventId: eventId.toString(),
      quantity: quantity.toString(),
    },

    // Payment success/cancel hole kothay pathabo
    success_url: `${config.backend_url}/payment/success?ticketId=${ticket._id}`,
    cancel_url: `${config.backend_url}/payment/cancel?ticketId=${ticket._id}`,
  });

  // Session id ticket e save koro
  await Ticket.findByIdAndUpdate(ticket._id, {
    stripeSessionId: session.id,
  });

  return {
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    checkoutUrl: session.url, // ← frontend e redirect korbe ei url e
    totalAmount,
    event: {
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
    },
  };
};

// ─── 2. Stripe Webhook — payment success hole ticket confirm koro ──────────


// const confirmTicketPayment = async (rawBody: Buffer, signature: string) => {
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

//   if (stripeEvent.type === 'checkout.session.completed') {
//     const session = stripeEvent.data.object as Stripe.Checkout.Session;

//     const ticketId = session.metadata?.ticketId;
//     if (!ticketId) throw new Error('Ticket ID not found in metadata');

//     // Ticket status update koro
//     await Ticket.findByIdAndUpdate(ticketId, {
//       paymentStatus: 'completed',
//       stripeSessionId: session.id,
//     });

//     // Event attendees e user add koro (tomar event model e thakle)
//     const ticket = await Ticket.findById(ticketId);
//     if (ticket) {
//       await Event.findByIdAndUpdate(ticket.event, {
//         $addToSet: { attendees: ticket.user },
//       });
//     }
//   }

//   // Payment fail hole
//   if (stripeEvent.type === 'checkout.session.expired') {
//     const session = stripeEvent.data.object as Stripe.Checkout.Session;
//     const ticketId = session.metadata?.ticketId;

//     if (ticketId) {
//       await Ticket.findByIdAndUpdate(ticketId, {
//         paymentStatus: 'failed',
//       });
//     }
//   }

//   return { received: true };
// };





export const ticketService = {
  buyTicket,
//   handleTicketWebhook,
  getMyTickets,
  getTicketDetails,
  getTicketQRCode,
  scanTicket,
};