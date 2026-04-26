
import AppError from "../../error/AppError";
import catchAsync from "../../utils/catchAsync";
import { uploadManyToS3, uploadToS3 } from "../../utils/fileHelper";
import sendResponse from "../../utils/sendResponse";
import { Event } from "./event.model";
import { eventServices } from "./event.service";
import httpStatus  from 'http-status';





export const createEvent = catchAsync(async (req, res) => {
  let coverImage;
  let gallery: { id: string; url: string }[] = [];

  if (req.files && (req.files as any).coverImage) {
    const coverFile = (req.files as any).coverImage[0];
    coverImage = await uploadToS3(coverFile, 'events/cover');
  }

  if (req.files && (req.files as any).gallery) {
    const galleryFiles = (req.files as any).gallery;
    gallery = await uploadManyToS3(
      galleryFiles.map((file: any) => ({
        file,
        path: 'events/gallery',
      }))
    );
  }

  const result = await eventServices.createEventService(
    req.body,
    req.user,
    coverImage,
    gallery
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Event created successfully',
    data: result,
  });
});


export const getAllEvents = catchAsync(async (req, res) => {
  const result = await eventServices.getAllEventsService(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Events fetched successfully",
    meta: result.meta, // 👈 add this
    data: result.data,
  });
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
 
// export const getAllCategories = catchAsync(async (req, res) => {
//   const result = await eventServices.getAllCategories();

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Categories fetched successfully",
//     data: result,
//   });
// });



export const getAllCategories = catchAsync(async (req, res) => {
  const { category } = req.query;

  const result = await Event.find({ category })
    .populate("host", "fullName image")
    .sort({ date: 1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Events fetched by category",
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








const getMyTicketsnewfilter = catchAsync(async (req, res) => {
  // ?filter=upcoming or ?filter=previous
  const filter = (req.query.filter as 'upcoming' | 'previous') || 'upcoming';

  const result = await eventServices.getMyTicketnew(
    req.user._id as string,
    filter,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${filter === 'upcoming' ? 'Upcoming' : 'Previous'} tickets fetched successfully`,
    data: result,
  });
});














export const addReviewadd = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  const userId = req.user?.id;

  const event = await Event.findById(eventId);

  if (!event) {
    throw new AppError(404, "Event not found");
  }

  // ✅ ensure reviews array exists (fix TS + runtime issue)
  if (!event.reviews) {
    event.reviews = [];
  }

  // ❌ prevent duplicate review
  const alreadyReviewed = event.reviews.find(
    (r: any) => r.user.toString() === userId.toString()
  );

  if (alreadyReviewed) {
    throw new AppError(400, "You already reviewed this event");
  }

  // ✅ single image upload
  let image = { id: "", url: "" };

  if (req.files && (req.files as any).image) {
    const file = (req.files as any).image[0];
    image = await uploadToS3(file, "events/reviews");
  }

  // ✅ create review
  const newReview = {
    user: userId,
    rating: Number(req.body.rating),
    comment: req.body.comment,
    images: image.url ? [image] : [],
    isAnonymous: req.body.isAnonymous || false,
  };

  // ✅ push review
  event.reviews.push(newReview as any);

  await event.save();

  res.status(201).json({
    success: true,
    message: "Review added successfully",
    data: newReview,
  });
});








export const getAutoSuggestions = catchAsync(
  async (req , res) => {
    const { address } = req.query;

    const suggestions = await eventServices.getmapSuggestions(address as string);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  }
);





export const getNearbyEventsController = catchAsync(
  async (req, res) => {
    const { lat, lng, radius } = req.query;

    console.log("Received coordinates:", { lat, lng, radius }); // Debug log

    const events = await eventServices.getsearchEvents(
      Number(lat),
      Number(lng),
      radius ? Number(radius) : 10
    );
    console.log("Nearby events:", events); // Debug log

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Nearby events fetched successfully",
      data: events,
    });
  }
);








// ── 3. Dashboard Stats ────────────────────────────────────────────────────────
const getDashboardStats = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  const result = await eventServices.getDashboardStats(userId);
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard stats fetched successfully",
    data: result,
  });
});








// GET /api/v1/events/all?type=upcoming&search=sunset
// GET /api/v1/events/all?type=past
// GET /api/v1/events/all?search=skate
const getAllMyEvents = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  const query = req.query; // { type, search }
 
  const result = await eventServices.getAllMyEvents(userId, query);
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events fetched successfully",
    data: result,
  });
});








// ── 5. Recent Payments ────────────────────────────────────────────────────────
const getRecentPayments = catchAsync(async (req, res) => {
  const userId = req.user?._id;
  const result = await eventServices.getRecentPayments(userId);
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent payments fetched successfully",
    data: result,
  });
});














// GET /api/v1/events/:id/attendees?page=1&limit=10
const getEventAttendees = catchAsync(async (req, res) => {
  const { id } = req.params;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const skip = (page - 1) * limit;
 
  const event = await Event.findById(id)
    .populate({
      path: "attendees",
      select: "name email profileImage",
      options: {
        skip,
        limit,
      },
    })
    .select("attendees title");
 
  if (!event) throw new AppError(httpStatus.NOT_FOUND, "Event not found");
 
  // total attendees count (pagination এর জন্য)
  const eventForCount = await Event.findById(id).select("attendees");
  const totalAttendees = (eventForCount?.attendees || []).length;
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendees fetched successfully",
    data: {
      eventTitle: event.title,
      attendees: event.attendees || [],
      pagination: {
        total: totalAttendees,
        page,
        limit,
        totalPages: Math.ceil(totalAttendees / limit),
      },
    },
  });
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
  addReviewadd,
  getAutoSuggestions,
  getNearbyEventsController,
  getDashboardStats,
  getAllMyEvents,
  getRecentPayments,
  getMyTicketsnewfilter,
  getEventAttendees,
};