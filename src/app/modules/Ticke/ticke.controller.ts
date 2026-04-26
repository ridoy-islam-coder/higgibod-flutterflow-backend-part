// ticket.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { downloadTicketImage, ticketService } from "./ticke.service";
import httpStatus  from 'http-status';
import { Ticket } from "./ticke.model";
import AppError from "../../error/AppError";



const buyTicket = catchAsync(async (req: Request, res: Response) => {
  const { quantity = 1, ticketType = "General" } = req.body;
  const result = await ticketService.buyTicket(
    req.user._id,
    req.params.eventId as string,
    quantity,
    ticketType
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Ticket payment initiated",
    data: result,
  });
});


// ⚠️ Webhook — catchAsync use korbo na, raw body dorkar

// const ticketWebhook = async (req: Request, res: Response) => {
//   try {
//     const signature = req.headers["stripe-signature"] as string;
//     const result = await ticketService.handleTicketWebhook(
//       req.body,
//       signature
//     );
//     res.status(200).json(result);
//   } catch (error: any) {
//     res.status(400).json({ error: error.message });
//   }
// };


const getMyTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await ticketService.getMyTickets(
    req.user._id,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tickets fetched successfully",
    data: result,
  });
});


const getTicketDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await ticketService.getTicketDetails(
    req.params.id as string,
    req.user._id
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Ticket details fetched",
    data: result,
  });
});


const getTicketQRCode = catchAsync(async (req: Request, res: Response) => {
  const result = await ticketService.getTicketQRCode(
    req.params.id as string,
    req.user._id
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "QR Code generated",
    data: result,
  });
});


// Entry scanner er jonno — admin/organizer use korbe
const scanTicket = catchAsync(async (req: Request, res: Response) => {
  const { ticketNumber } = req.body;
  const result = await ticketService.scanTicket(ticketNumber);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});



//new api add




// ── 1. Earning Overview ───────────────────────────────────────────────────────
// GET /api/v1/earnings/overview?year=2025
// const getEarningOverview = catchAsync(async (req: Request, res: Response) => {
//   const userId = req.user?._id;
//   const year = req.query.year ? parseInt(req.query.year as string) : undefined;
 
//   const result = await ticketService.getEarningOverview(userId, year);
 
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Earning overview fetched successfully",
//     data: result,
//   });
// });
 

// ── Controller ─────────────────────────────────────────────────────────────────
const getEarningOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await ticketService.getEarningOverview(
    req.user?._id,
    req.query.year ? parseInt(req.query.year as string) : undefined,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Earning overview fetched successfully',
    data: result,
  });
});


// ── 2. My Events List (dropdown) ──────────────────────────────────────────────
// GET /api/v1/earnings/events
const getMyEventsList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;
 
  const result = await ticketService.getMyEventsList(userId);
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events list fetched successfully",
    data: result,
  });
});
 
// ── 3. Earning by Event (analytics) ──────────────────────────────────────────
// GET /api/v1/earnings/by-event/:eventId
const getEarningByEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { eventId } = req.params;
 
  const result = await ticketService.getEarningByEvent(userId, eventId as string);
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Earning analytics fetched successfully",
    data: result,
  });
});






// GET /api/v1/tickets/:id/download/image
const downloadImage = catchAsync(async (req: Request, res: Response) => {
  const buffer = await ticketService.downloadTicketImage(req.params.id as string, req.user._id);
 
  res.set({
    "Content-Type": "image/png",
    "Content-Disposition": `attachment; filename="ticket-${req.params.id}.png"`,
    "Content-Length": buffer.length,
  });
 
  res.send(buffer);
});





export const ticketController = {
  buyTicket,
//   ticketWebhook,
  getMyTickets,
  getTicketDetails,
  getTicketQRCode,
  scanTicket,
  // New APIs
  getEarningOverview,
  getMyEventsList,
  getEarningByEvent,
  downloadImage,
};