// ticket.service.ts
import Stripe from "stripe";
import QRCode from "qrcode";

import { Event } from "../event/event.model";
import User from "../user/user.model";
import { Ticket } from "./ticke.model";
import config from "../../config";
import mongoose from "mongoose";


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


// const buyTicket = async (
//   userId: string,
//   eventId: string,
//   quantity: number = 1,
//   ticketType: string = 'General',
// ) => {
//   // User info
//   const user = await User.findById(userId);
//   if (!user) throw new Error('User not found');

//   // Event info
//   const event = await Event.findById(eventId);
//   if (!event) throw new Error('Event not found');

//   if (event.isPast) throw new Error('This event has already passed');

//   const pricePerTicket = event.price || 0;
//   const totalAmount = pricePerTicket * quantity;

//   // Ticket DB te save koro — pending status (tomar logic same)
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
//     paymentStatus: 'paid',
//   });

//   // Stripe Checkout Session create
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'payment',
//     customer_email: user.email, // checkout e email prefill hobe

//     line_items: [
//       {
//         quantity,
//         price_data: {
//           currency: 'usd',
//           unit_amount: Math.round(pricePerTicket * 100), // cents
//           product_data: {
//             name: event.title,
//             description: `Ticket Type: ${ticketType} | Date: ${new Date(event.date).toDateString()}`,
//           },
//         },
//       },
//     ],

//     metadata: {
//       ticketId: ticket._id.toString(), // webhook e use korbo
//       userId: userId.toString(),
//       eventId: eventId.toString(),
//       quantity: quantity.toString(),
//     },

//     // Payment success/cancel hole kothay pathabo
//     success_url: `${config.backend_url}/payment/success?ticketId=${ticket._id}`,
//     cancel_url: `${config.backend_url}/payment/cancel?ticketId=${ticket._id}`,
//   });

//   // Session id ticket e save koro
//   await Ticket.findByIdAndUpdate(ticket._id, {
//     stripeSessionId: session.id,
//   });

//   return {
//     ticketId: ticket._id,
//     ticketNumber: ticket.ticketNumber,
//     checkoutUrl: session.url, // ← frontend e redirect korbe ei url e
//     totalAmount,
//     event: {
//       title: event.title,
//       date: event.date,
//       time: event.time,
//       location: event.location,
//     },
//   };
// };












// ── 1. Buy Ticket — quantity support সহ ──────────────────────────────────────
const buyTicket = async (
  userId: string,
  eventId: string,
  quantity: number = 1,
  ticketType: string = "General"
) => {
  // ── Validation ──────────────────────────────────────────────
  if (quantity < 1 || quantity > 10) {
    throw new Error("Quantity must be between 1 and 10");
  }
 
  // User info
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
 
  // Event info
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");
  if (event.isPast) throw new Error("This event has already passed");
 
  const pricePerTicket = event.price || 0;
  const totalAmount = pricePerTicket * quantity; // quantity দিয়ে total
 
  // ── Ticket DB তে save (pending) ─────────────────────────────
  // quantity যতই হোক — একটাই ticket record, quantity field এ number থাকবে
  const ticket = await Ticket.create({
    user: userId,
    event: eventId,
    ticketNumber: generateTicketNumber(),
    attendeeName: user.name,
    attendeeEmail: user.email,
    ticketType,
    quantity,          // ← 1, 2, 3... যা দিবে
    price: pricePerTicket,
    totalAmount,       // ← price × quantity
    paymentStatus: "pending",
  });
 
  // ── Stripe Checkout Session ──────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity,        // ← Stripe এও quantity যাচ্ছে
        price_data: {
          currency: "usd",
          unit_amount: Math.round(pricePerTicket * 100), // cents (per ticket)
          product_data: {
            name: `${event.title} — ${ticketType} Ticket`,
            description: `Quantity: ${quantity} | Date: ${new Date(event.date).toDateString()}`,
          },
        },
      },
    ],
    metadata: {
      ticketId: ticket._id.toString(),
      userId: userId.toString(),
      eventId: eventId.toString(),
      quantity: quantity.toString(),
    },
    success_url: `${config.backend_url}/payment/success?ticketId=${ticket._id}`,
    cancel_url: `${config.backend_url}/payment/cancel?ticketId=${ticket._id}`,
  });
 
  // ── Session ID ticket এ save ─────────────────────────────────
  // model এ stripePaymentIntentId আছে — ওটাতেই session id রাখো
  await Ticket.findByIdAndUpdate(ticket._id, {
    stripePaymentIntentId: session.id, // ← session id এখানে save
  });
 
  return {
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    quantity,
    pricePerTicket,
    totalAmount,
    checkoutUrl: session.url, // ← frontend এই URL এ redirect করবে
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



//new api routes



// ── 1. Earning Overview ───────────────────────────────────────────────────────
// Total Earning, Tickets Sold, Monthly Earning, Recent Payments
const getEarningOverview = async (userId: string, year?: number) => {
  const targetYear = year || new Date().getFullYear();
 
  // Organizer এর সব event IDs
  const myEvents = await Event.find(
    { host: userId, isDeleted: false },
    { _id: 1 }
  );
  const eventIds = myEvents.map((e) => e._id);
 
  // ── Total Earning & Tickets Sold ──────────────────────────────
  const totals = await Ticket.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        paymentStatus: "paid",
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalEarning: { $sum: "$totalAmount" },
        ticketsSold: { $sum: "$quantity" },
      },
    },
  ]);
 
  const totalEarning = totals[0]?.totalEarning || 0;
  const ticketsSold = totals[0]?.ticketsSold || 0;
 
  // ── Monthly Earning (selected year) ──────────────────────────
  const monthlyEarning = await Ticket.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        paymentStatus: "paid",
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${targetYear}-01-01`),
          $lte: new Date(`${targetYear}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        earning: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
 
  // সব 12 মাস fill করো (0 হলেও দেখাবে)
  const months = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyEarning.find((m) => m._id === i + 1);
    return {
      month: i + 1,
      monthName: new Date(targetYear, i, 1).toLocaleString("en", { month: "short" }),
      earning: found?.earning || 0,
    };
  });
 
  // ── Recent Payments (latest 4) ────────────────────────────────
  const recentPayments = await Ticket.find({
    event: { $in: eventIds },
    paymentStatus: "paid",
    isDeleted: false,
  })
    .populate("event", "title")
    .populate("user", "name profileImage")
    .sort({ createdAt: -1 })
    .limit(4)
    .select("totalAmount quantity ticketType createdAt event user");
 
  return {
    totalEarning,
    ticketsSold,
    year: targetYear,
    monthlyEarning: months,
    recentPayments,
  };
};
 
// ── 2. Earning Analytics — event dropdown filter ──────────────────────────────
// Organizer এর সব events list (dropdown এর জন্য)
const getMyEventsList = async (userId: string) => {
  const events = await Event.find(
    { host: userId, isDeleted: false },
    { title: 1, date: 1 }
  ).sort({ date: -1 });
 
  return events;
};
 
// নির্দিষ্ট event এর সব payments
const getEarningByEvent = async (userId: string, eventId: string) => {
  // Verify this event belongs to this organizer
  const event = await Event.findOne({
    _id: eventId,
    host: userId,
    isDeleted: false,
  });
  if (!event) throw new Error("Event not found");
 
  const payments = await Ticket.find({
    event: eventId,
    paymentStatus: "paid",
    isDeleted: false,
  })
    .populate("user", "name profileImage")
    .sort({ createdAt: -1 })
    .select("totalAmount quantity ticketType createdAt user attendeeName attendeeEmail");
 
  // Event summary
  const summary = await Ticket.aggregate([
    {
      $match: {
        event: new mongoose.Types.ObjectId(eventId),
        paymentStatus: "paid",
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalEarning: { $sum: "$totalAmount" },
        ticketsSold: { $sum: "$quantity" },
      },
    },
  ]);
 
  return {
    event: {
      _id: event._id,
      title: event.title,
      date: event.date,
    },
    totalEarning: summary[0]?.totalEarning || 0,
    ticketsSold: summary[0]?.ticketsSold || 0,
    payments,
  };
};


export const ticketService = {
  buyTicket,
//   handleTicketWebhook,
  getMyTickets,
  getTicketDetails,
  getTicketQRCode,
  scanTicket,

  // New APIs
  getEarningOverview,
  getMyEventsList,
  getEarningByEvent,
};