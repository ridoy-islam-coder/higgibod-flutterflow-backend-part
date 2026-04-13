// ticket.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ticketService } from "./ticke.service";



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


export const ticketController = {
  buyTicket,
//   ticketWebhook,
  getMyTickets,
  getTicketDetails,
  getTicketQRCode,
  scanTicket,
};