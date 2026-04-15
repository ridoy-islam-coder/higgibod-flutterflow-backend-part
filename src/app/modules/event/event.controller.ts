
import catchAsync from "../../utils/catchAsync";
import { uploadManyToS3, uploadToS3 } from "../../utils/fileHelper";
import sendResponse from "../../utils/sendResponse";
import { eventServices } from "./event.service";
import httpStatus  from 'http-status';


export const createEvent = catchAsync(async (req , res) => {
  let coverImage;
  let gallery: { id: string; url: string }[] = [];

  // ✅ cover image upload
  if (req.files && (req.files as any).coverImage) {
    const coverFile = (req.files as any).coverImage[0];
    coverImage = await uploadToS3(coverFile, 'events/cover');
  }

  // ✅ gallery images upload
  if (req.files && (req.files as any).gallery) {
    const galleryFiles = (req.files as any).gallery;
    gallery = await uploadManyToS3(
      galleryFiles.map((file: any) => ({
        file,
        path: 'events/gallery',
      }))
    );
  }

  const result = await eventServices.createEventService(req, coverImage, gallery);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Event created successfully',
    data: result,
  });
});




export const getAllEvents = catchAsync(async (req, res) => {
  const result = await eventServices.getAllEventsService();
  sendResponse(res, { statusCode: 200, success: true, message: "Events fetched successfully", data: result });
});

export const getPastEvents = catchAsync(async (req, res) => {
  const result = await eventServices.getPastEventsService();
  sendResponse(res, { statusCode: 200, success: true, message: "Past events fetched successfully", data: result });
});

export const getEventDetails = catchAsync(async (req, res) => {
  const result = await eventServices.getEventDetailsService(req.params.id as string);
  sendResponse(res, { statusCode: 200, success: true, message: "Event details fetched successfully", data: result });
});

export const updateEvent = catchAsync(async (req, res) => {
  let coverImage;
  let gallery: { id: string; url: string }[] = [];

  if (req.files && (req.files as any).coverImage) {
    coverImage = await uploadToS3((req.files as any).coverImage[0], 'events/cover');
  }
  if (req.files && (req.files as any).gallery) {
    gallery = await uploadManyToS3(
      (req.files as any).gallery.map((file: any) => ({ file, path: 'events/gallery' }))
    );
  }

  const result = await eventServices.updateEventService(req, coverImage, gallery);
  sendResponse(res, { statusCode: 200, success: true, message: "Event updated successfully", data: result });
});

export const deleteEvent = catchAsync(async (req, res) => {
  const result = await eventServices.deleteEventService(req.params.id as string);
  sendResponse(res, { statusCode: 200, success: true, message: "Event deleted successfully", data: result });
});

export const attendEvent = catchAsync(async (req, res) => {
  const result = await eventServices.attendEventService(req);
  sendResponse(res, { statusCode: 200, success: true, message: result.message, data: null });
});

export const addReview = catchAsync(async (req, res) => {
  const result = await eventServices.addReviewService(req);
  sendResponse(res, { statusCode: 200, success: true, message: "Review added successfully", data: result });
});




const searchEvents = catchAsync(async (req, res) => {
  const result = await eventServices.searchEvents({
    q: req.query.q as string,
    category: req.query.category as string,
    country: req.query.country as string,
    eventType: req.query.eventType as string,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    date: req.query.date as string,
    organizer: req.query.organizer as string,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 10,
  });
 
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Events fetched successfully",
    data: result,
  });
});
 
const getFeaturedEvents = catchAsync(async (req, res) => {
  const result = await eventServices.getFeaturedEvents();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Featured events fetched",
    data: result,
  });
});
 
const getNearbyEvents = catchAsync(async (req, res) => {
  const location = req.query.location as string;
  if (!location) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Location is required",
      data: null,
    });
  }
  const result = await eventServices.getNearbyEvents(location);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Nearby events fetched",
    data: result,
  });
});
 
const getEventsByOrganizer = catchAsync(async (req, res) => {
  const result = await eventServices.getEventsByOrganizer(req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Organizer events fetched",
    data: result,
  });
});
 
const getAllCategories = catchAsync(async (req, res) => {
  const result = await eventServices.getAllCategories();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Categories fetched",
    data: result,
  });
});


// ─── GET /api/events?isPast=true|false ───────────────────────────────────────
const getEvents = catchAsync(async (req, res) => {
  try {
    const isPast = req.query.isPast === "true";
    const events = isPast
      ? await eventServices.getPreviousEvents()
      : await eventServices.getUpcomingEvents();
        sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Events fetched successfully",
    data: events,
  });
  
  } catch (error: any) {
       sendResponse(res, {
    statusCode: 500,
    success: false,
    message: "Something went wrong",
    data: null,
  });

  }
});


export const eventcontroller = {
createEvent,
getAllEvents,
getPastEvents,
getEventDetails,
updateEvent,
deleteEvent,
attendEvent,
addReview,
// search + extra features
  searchEvents,
  getFeaturedEvents,
  getNearbyEvents,
  getEventsByOrganizer,
  getAllCategories,
  getEvents,

};