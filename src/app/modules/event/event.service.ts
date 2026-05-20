import axios from "axios";
import AppError from "../../error/AppError";
import { deleteManyFromS3, uploadToS3 } from "../../utils/fileHelper";
import { Event } from "./event.model";
import config from "../../config";
import { Ticket } from "../Ticke/ticke.model";
import { Review } from "../profilereview/profilereview.model";
import { Follow } from "../Follow/follow.model";
import httpStatus  from 'http-status';
import mongoose, { Types } from "mongoose";
import { Product } from "../product/product.model";
import { updatePastEvents } from "../../utils/updatePastEvents";
import { isPast } from "date-fns/isPast";
import User from "../user/user.model";
import { IReply } from "./event.interface";




export const createEventService = async (
  body: any,
  user: any,
  coverImage?: { id: string; url: string },
  gallery?: { id: string; url: string }[]
) => {
  const {
    title,
    category,
    date,
    time,
    description,
    price,
   isFeatured,
    isPinned,
    isHighlighted,
    isTopEvent,
    longitude,
    latitude,
    skiteeventType,
  } = body;

  if (!title || !date) {
    throw new AppError(400, 'Title and date are required');
  }

  // ✅ Geo location build
  let geoLocation;

  if (longitude && latitude) {
    geoLocation = {
      type: "Point",
      coordinates: [
        parseFloat(longitude),
        parseFloat(latitude),
      ],
    };
  }

  const event = await Event.create({
    title,
    category: category || "",
    date,
    time: time || "",
    location: geoLocation, // 🔥 HERE
    description: description || "",
    price: price || 0,
    coverImage: coverImage || { id: "", url: "" },
    gallery: gallery || [],
    host: user?.id,
    isFeatured: isFeatured || false,
    isPinned: isPinned || false,
    isHighlighted: isHighlighted || false,
    isTopEvent: isTopEvent || false,
    skiteeventType:skiteeventType ||""
  });

  return event;
};


export const getAllEventsService = async (query: any) => {
  await updatePastEvents(); // ✅ query এর আগে update করুন
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  // 🔥 security: max limit
  const safeLimit = Math.min(limit, 50);

  const skip = (page - 1) * safeLimit;

  const filter = {
    isPast: false,
    date: { $gte: new Date() },
  };

  const events = await Event.find(filter)
    .select("title date time location attendees gallery coverImage")
    .populate("host", "fullName image")
    .populate("attendees", "name email profileImage")
    .sort({ date: 1 }) // upcoming events first
    .skip(skip)
    .limit(safeLimit);

  const total = await Event.countDocuments(filter);

  return {
    meta: {
      page,
      limit: safeLimit,
      total,
      totalPage: Math.ceil(total / safeLimit),
    },
    data: events,
  };
};


// event.getPastEvents
export const getPastEventsService = async () => {
  const events = await Event.find({
    date: { $lt: new Date() },
  })
    .select("title  date time  location  attendees gallery gallery coverImage")
    .populate("host", "fullName image email")
    .populate("attendees", "fullName image email")
    .sort({ date: -1 });
  return events;
};


// event.getEventDetails
// export const getEventDetailsService = async (id: string) => {
//   const event = await Event.findById(id)
//     .populate("host", "fullName image email")
//     .populate("attendees", "fullName image email")
//     .populate("reviews.user", "fullName image");
//   if (!event) throw new AppError(404, "Event not found");
//   return event;
// };






export const getEventDetailsService = async (
  id: string,
  currentUserId?: string
) => {
    await updatePastEvents(); // ✅ event details এর আগে update করুন
  const event = await Event.findById(id)
    .populate("host", "fullName image email")
    .populate("attendees", "fullName image email")
    .populate("reviews.user", "fullName image");
 
  if (!event) throw new AppError(httpStatus.NOT_FOUND, "Event not found");
 
  const host = event.host as any;
 
  // ── Host: Followers count ─────────────────────────────────
  const followersCount = await Follow.countDocuments({
    following: host._id,
  });
 
  // ── Host: Average rating ──────────────────────────────────
  const ratingResult = await Review.aggregate([
    {
      $match: {
        organizer: host._id,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
 
  const avgRating = ratingResult[0]?.avgRating
    ? parseFloat(ratingResult[0].avgRating.toFixed(1))
    : 0;
  const totalReviews = ratingResult[0]?.totalReviews || 0;
 
  // ── Host: Current user follow করেছে কিনা ─────────────────
  const isFollowing = currentUserId
    ? !!(await Follow.findOne({
        follower: currentUserId,
        following: host._id,
      }))
    : false;
 
  // ── Host: Current user review করেছে কিনা ─────────────────
  const hasReviewed = currentUserId
    ? !!(await Review.findOne({
        organizer: host._id,
        reviewer: currentUserId,
        isDeleted: { $ne: true },
      }))
    : false;
 
  return {
    ...event.toObject(),
    host: {
      ...host.toObject(),
      followersCount,
      avgRating,
      totalReviews,
      isFollowing,
      hasReviewed,
    },
  };
};










// ── Service ──────────────────────────────────────────────────────────────────
export const updateEventService = async (
  req: any,
  coverImage?: { id: string; url: string },
  gallery?: { id: string; url: string }[]
) => {
  const { id } = req.params;

  const {
    title,
    category,
    date,
    time,
    description,
    price,
    isFeatured,
    isPinned,
    isHighlighted,
    isTopEvent,
    longitude,
    latitude,
    skiteeventType,
  } = req.body;

  // ✅ Geo location — নতুন coordinate আসলে update, না আসলে skip
  let geoLocation;
  if (longitude && latitude) {
    geoLocation = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
  }

  const updateData: any = {
    ...(title !== undefined && { title }),
    ...(category !== undefined && { category }),
    ...(date !== undefined && { date }),
    ...(time !== undefined && { time }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: Number(price) }),
    ...(isFeatured !== undefined && { isFeatured: isFeatured === 'true' || isFeatured === true }),
    ...(isPinned !== undefined && { isPinned: isPinned === 'true' || isPinned === true }),
    ...(isHighlighted !== undefined && { isHighlighted: isHighlighted === 'true' || isHighlighted === true }),
    ...(isTopEvent !== undefined && { isTopEvent: isTopEvent === 'true' || isTopEvent === true }),
    ...(geoLocation && { location: geoLocation }),
    ...(coverImage && { coverImage }),
    // ✅ নতুন gallery আসলে replace, না আসলে পুরনোটা থাকবে
    ...(gallery && gallery.length > 0 && { gallery }),
    ...(skiteeventType !== undefined && { skiteeventType }), 
  };

  const event = await Event.findByIdAndUpdate(id, { $set: updateData }, { new: true });

  if (!event) throw new AppError(404, 'Event not found');

  return event;
};



export const deleteEventService = async (id: string) => {
  const event = await Event.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!event) throw new AppError(404, "Event not found");
  return { message: "Event deleted successfully" };
};




export const attendEventService = async (req: any) => {
  const userId = req.user?.id;
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) throw new AppError(404, "Event not found");

  const alreadyAttending = event.attendees?.some(
    (attendee: any) => attendee.toString() === userId
  );

  if (alreadyAttending) {
    // ✅ already attending → remove (toggle)
    await Event.findByIdAndUpdate(id, {
      $pull: { attendees: userId },
    });
    return { message: "Left event successfully" };
  }

  await Event.findByIdAndUpdate(id, {
    $addToSet: { attendees: userId },
  });
  return { message: "Joined event successfully" };
};


export const addReviewService = async (req: any) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment)
    throw new AppError(400, "Rating and comment are required");

  const event = await Event.findById(id);
  if (!event) throw new AppError(404, "Event not found");

  const alreadyReviewed = event.reviews?.some(
    (review: any) => review.user.toString() === userId
  );
  if (alreadyReviewed)
    throw new AppError(400, "You have already reviewed this event");

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    { $push: { reviews: { user: userId, rating: Number(rating), comment } } },
    { new: true }
  ).populate("reviews.user", "fullName image");

  return updatedEvent;
};












// const searchEvents = async (query: {
//   q?: string;
//   category?: string;
//   country?: string;
//   eventType?: string;
//   minPrice?: number;
//   maxPrice?: number;
//   date?: string;
//   organizer?: string;
//   page?: number;
//   limit?: number;
// }) => {
//   const {
//     q,
//     category,
//     country,
//     eventType,
//     minPrice,
//     maxPrice,
//     date,
//     organizer,
//     page = 1,
//     limit = 10,
//   } = query;

//   // ✅ Base filter
//   const filter: Record<string, any> = {
//     isDeleted: false,
//     isPast: false,
//   };

//   // ✅ Keyword search
//   if (q?.trim()) {
//     filter.$or = [
//       {
//         title: {
//           $regex: q.trim(),
//           $options: "i",
//         },
//       },
//       {
//         description: {
//           $regex: q.trim(),
//           $options: "i",
//         },
//       },
//     ];
//   }

//   // ✅ Category filter
//   if (category) {
//     filter.category = category;
//   }

//   // ✅ Country filter
//   if (country) {
//     filter.location = {
//       $regex: country,
//       $options: "i",
//     };
//   }

//   // ✅ Event type filter
//   if (eventType) {
//     filter.eventType = eventType;
//   }

//   // ✅ Organizer filter
//   if (organizer) {
//     filter.host = organizer;
//   }

//   // ✅ Price filter
//   if (minPrice !== undefined || maxPrice !== undefined) {
//     filter.price = {};

//     if (minPrice !== undefined) {
//       filter.price.$gte = minPrice;
//     }

//     if (maxPrice !== undefined) {
//       filter.price.$lte = maxPrice;
//     }
//   }

//   // ✅ Date filter
//   if (date) {
//     const targetDate = new Date(date);

//     const nextDay = new Date(targetDate);
//     nextDay.setDate(nextDay.getDate() + 1);

//     filter.date = {
//       $gte: targetDate,
//       $lt: nextDay,
//     };
//   }

//   // ✅ Pagination
//   const skip = (page - 1) * limit;

//   // ✅ Total count
//   const total = await Event.countDocuments({
//     ...filter,
//   });

//   // ✅ Fetch events
//   const events = await Event.find({
//     ...filter,
//   })
//     .select(
//       "title description date time location attendees gallery price coverImage"
//     )
//     .populate("host", "image email fullName")
//     .populate("attendees", "image email fullName")
//     .sort({ date: 1 })
//     .skip(skip)
//     .limit(limit);

//   console.log("Search Filter:", filter);
//   console.log("Total Events:", total);

//   return {
//     events,
//     pagination: {
//       total,
//       page,
//       limit,
//       totalPages: Math.ceil(total / limit),
//     },
//   };
// };












const searchEvents = async (query: {
  q?: string;
  category?: string;
  country?: string;
  skiteeventType?: string;
  minPrice?: number;
  maxPrice?: number;
  date?: string;
  startDate?: string; // ✅ নতুন
  endDate?: string;   // ✅ নতুন
  organizer?: string;
  page?: number;
  limit?: number;
}) => {
  const {
    q,
    category,
    country,
    skiteeventType,
    minPrice,
    maxPrice,
    date,
    startDate, // ✅ নতুন
    endDate,   // ✅ নতুন
    organizer,
    page = 1,
    limit = 10,
  } = query;

  const filter: Record<string, any> = {
    isDeleted: false,
    isPast: false,
  };

  if (q?.trim()) {
    filter.$or = [
      { title: { $regex: q.trim(), $options: 'i' } },
      { description: { $regex: q.trim(), $options: 'i' } },
    ];
  }

  if (category) filter.category = category;

  if (country) {
    filter.location = { $regex: country, $options: 'i' };
  }

  if (skiteeventType) filter.skiteeventType = skiteeventType;

  if (organizer) filter.host = organizer;

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // ✅ single date filter (আগের মতোই)
  if (date) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.date = {
      $gte: targetDate,
      $lt: nextDay,
    };
  }

  // ✅ startDate & endDate range filter
  // date filter থাকলে এটা skip হবে, conflict এড়াতে
  if (!date && (startDate || endDate)) {
    filter.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // দিনের শুরু
      filter.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // দিনের শেষ
      filter.date.$lte = end;
    }
  }

  const skip = (page - 1) * limit;
  const total = await Event.countDocuments({ ...filter });

  const events = await Event.find({ ...filter })
    .select('title description date time location attendees gallery price coverImage')
    .populate('host', 'image email fullName')
    .populate('attendees', 'image email fullName')
    .sort({ date: 1 })
    .skip(skip)
    .limit(limit);

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

















 
// const getFeaturedEvents = async () => {
//   // Featured = upcoming events with most attendees
//   return await Event.find({
//     isDeleted: { $ne: true },
//     isPast: false,
//     date: { $gte: new Date() },
//   })
//     .populate("host", "name profileImage")
//     .sort({ attendees: -1, date: 1 })
//     .limit(5);
// };
 
const getNearbyEvents = async (location: string) => {
  return await Event.find({
    isDeleted: { $ne: true },
    isPast: false,
    location: { $regex: location, $options: "i" },
    date: { $gte: new Date() },
  })
    .populate("host", "name profileImage")
    .sort({ date: 1 })
    .limit(10);
};
 
const getEventsByOrganizer = async (organizerId: string) => {
  return await Event.find({
    isDeleted: { $ne: true },
    host: organizerId,
  })
    .populate("host", "name email profileImage")
    .sort({ createdAt: -1 });
};
 





//  export const getAllCategories = async () => {
//   const categories = await Event.distinct("category");

//   // empty string remove (optional clean)
//   return categories.filter((cat) => cat && cat.trim() !== "");
// };






// ─── Get all upcoming events (isPast = false) ───────────────────────────────
const getUpcomingEvents = async () => {
  const events = await Event.find({ isPast: false })
    .populate("host", "name email profileImage")
    .sort({ date: 1 });
  return events;
};
 
// ─── Get all previous events (isPast = true) ────────────────────────────────
const getPreviousEvents = async () => {
  const events = await Event.find({ isPast: true })
    .populate("host", "name email profileImage")
    .sort({ date: -1 });
  return events;
};
 








const GOOGLE_MAPS_API =config.google_maps_api_key;

export const getmapSuggestions = async (address: string) => {
  if (!address) {
    throw new AppError(400, "Address is required");
  }

  if (!GOOGLE_MAPS_API) {
    throw new AppError(500, "Google Maps API key not found");
  }

  const autoUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    address
  )}&types=geocode&key=${GOOGLE_MAPS_API}`;

  const autoResponse = await axios.get(autoUrl);

  if (autoResponse.data.status !== "OK") {
    throw new AppError(
      400,
      autoResponse.data.error_message || "Failed to fetch suggestions"
    );
  }

  const predictions = autoResponse.data.predictions;


  const results = await Promise.all(
    predictions.map(async (place: any) => {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=geometry&key=${GOOGLE_MAPS_API}`;

      const detailsResponse = await axios.get(detailsUrl);

      const location = detailsResponse.data.result.geometry.location;

      return {
        address: place.description,
        lat: location.lat,
        lng: location.lng,
      };
    })
  );

  return results;
};





// export const getsearchEvents = async (
//   latitude: number,
//   longitude: number,
//   radiusInKm: number = 10
// ) => {
//   if (!latitude || !longitude) {
//     throw new Error("Latitude and Longitude required");
//   }

//   const radiusInMeters = radiusInKm * 1000;

//   const events = await Event.find({
//     location: {
//       $near: {
//         $geometry: {
//           type: "Point",
//           coordinates: [longitude, latitude], // ⚠️ IMPORTANT: [lng, lat]
//         },
//         $maxDistance: radiusInMeters,
//       },
       
//     },
//   }) .limit(1); // 🔥 only 1 nearest event;


//   return events;
// };


export const getsearchEvents = async (
  latitude: number,
  longitude: number,
  radiusInKm: number = 10
) => {
  if (!latitude || !longitude) {
    throw new Error("Latitude and Longitude required");
  }

  const radiusInMeters = radiusInKm * 1000;

  const events = await Event.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        key: "location",
        distanceField: "distance",
        maxDistance: radiusInMeters,
        spherical: true,
      },
    },
    {
      $match: {
        isDeleted: { $ne: true },
        isPast: false,
      },
    },
    {
      $sort: { distance: 1 },
    },
  ]);

  return events;
};



//user using by fillter api 
const getMyTicketnew = async (
  userId: string,
  filter: 'upcoming' | 'previous',
  page = 1,
  limit = 10,
) => {
  const skip = (page - 1) * limit;

  const allTickets = await Ticket.find({
    user: userId,
    paymentStatus: 'paid',
    isDeleted: { $ne: true },
  })
    .populate({
      path: 'event',
      select: 'title date time location coverImage category price host isPast',
      populate: { path: 'category', select: 'name image' },
    })
    .sort({ createdAt: -1 });

  const filtered = allTickets.filter((ticket: any) => {
    const event = ticket.event;
    if (!event) return false;

    if (filter === 'upcoming') {
      return event.isPast === false;  // ← isPast false = upcoming
    } else {
      return event.isPast === true;   // ← isPast true = previous
    }
  });

  const total = filtered.length;
  const paginated = filtered.slice(skip, skip + limit);

  return {
    tickets: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};









//new api  

// ── 3. Dashboard Stats ────────────────────────────────────────────────────────
// Total events, total attendees, monthly earning
// ── Dashboard Stats Service ────────────────────────────────────────────────
// Total events, total attendees, total earnings, monthly earnings

const getDashboardStats = async (
  userId: string,
  year?: number
) => {

  const selectedYear = year || new Date().getFullYear();

  const hostId = new Types.ObjectId(userId);

  // ── Total Events ─────────────────────────────
  const totalEvent = await Event.countDocuments({
    host: hostId,
    isDeleted: false,
    date: {
      $gte: new Date(`${selectedYear}-01-01`),
      $lte: new Date(`${selectedYear}-12-31`),
    },
  });

  // ── Total Attendees ──────────────────────────
  const attendeesResult = await Event.aggregate([
    {
      $match: {
        host: hostId,
        isDeleted: { $ne: true },
        date: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalAttendees: {
          $sum: { $size: "$attendees" },
        },
      },
    },
  ]);

  const totalAttendees =
    attendeesResult[0]?.totalAttendees || 0;

  // ── Monthly Earnings ─────────────────────────
  const monthlyEarning = await Event.aggregate([
    {
      $match: {
        host: hostId,
        isDeleted: { $ne: true },
        date: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$date" },
        earning: {
          $sum: {
            $multiply: [
              "$price",
              { $size: "$attendees" },
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        month: "$_id",
        earning: 1,
      },
    },
  ]);

  // ── Fill Missing Months ──────────────────────
  const months = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyEarning.find(
      (m) => m.month === i + 1
    );

    return {
      month: i + 1,
      earning: found?.earning || 0,
    };
  });

  // ── Total Earnings ───────────────────────────
  const totalEarning = months.reduce(
    (sum, item) => sum + item.earning,
    0
  );

  return {
    year: selectedYear,
    totalEvent,
    totalAttendees,
    totalEarning,
    monthlyEarning: months,
  };
};



// ── Dashboard Stats Controller ─────────────────────────────────────────────


// // ── All Events (upcoming / past / search) ─────────────────────────────────────
// const getAllMyEvents = async (userId: string, query: any) => {
//   await updatePastEvents(); // ✅ event list এর আগে update করুন
//   const { type, search } = query;
//   const now = new Date();
 
//   const filter: any = {
//     host: userId,
//     isDeleted: false,
//   };
 
//   // upcoming or past filter
//   if (type === "upcoming") {
//     filter.date = { $gte: now };
//     filter.isPast = false;
//   } else if (type === "past") {
//     filter.date = { $lt: now };
//      filter.isPast = true;
//   }
 
//   // search by title (case-insensitive)
//   if (search && search.trim() !== "") {
//     filter.title = { $regex: search.trim(), $options: "i" };
//   }
 
//   const events = await Event.find(filter)
//     .populate("category", "name")
//     .sort({ date: type === "past" ? -1 : 1 }) // past: newest first, upcoming: soonest first
//     .select("title date time description location coverImage gallery price isHighlighted eventType isPinned isFeatured isTopEvent category");
 
//   return events;
// };


// ── All Events (upcoming / past / search / date filter) ─────────────────────

const getAllMyEvents = async (userId: string, query: any) => {

  await updatePastEvents();

  const {
    type,
    search,
    date,
    startDate,
    endDate,
  } = query;

  const now = new Date();

  const filter: any = {
    host: userId,
    isDeleted: false,
  };

  // ── Upcoming / Past Filter ───────────────────
  if (type === "upcoming") {
    filter.date = { $gte: now };
    filter.isPast = false;
  }

  else if (type === "past") {
    filter.date = { $lt: now };
    filter.isPast = true;
  }

  // ── Search By Title ──────────────────────────
  if (search && search.trim() !== "") {
    filter.title = {
      $regex: search.trim(),
      $options: "i",
    };
  }

  // ── Exact Date Filter ────────────────────────
  // Example:
  // ?date=2026-05-14

  if (date) {

    const selectedDate = new Date(date);

    const nextDate = new Date(selectedDate);

    nextDate.setDate(nextDate.getDate() + 1);

    filter.date = {
      $gte: selectedDate,
      $lt: nextDate,
    };
  }

  // ── Date Range Filter ───────────────────────
  // Example:
  // ?startDate=2026-01-01&endDate=2026-01-31

  if (startDate && endDate) {

    filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // ── Fetch Events ─────────────────────────────
  const events = await Event.find(filter)

    .populate("category", "name")

    .sort({
      date: type === "past" ? -1 : 1,
    })

    .select(
      `
      title
      date
      time
      description
      location
      coverImage
      gallery
      price
      isHighlighted
      eventType
      isPinned
      isFeatured
      isTopEvent
      category
      skiteeventType
      `
    );

  return events;
};









const getRecentPayments = async (
  userId: string,
  page = 1,
  limit = 10,
  searchTerm?: string
) => {
  const skip = (page - 1) * limit;

  const query: any = {
    host: userId,
    isDeleted: false,
    "attendees.0": { $exists: true },
  };

  // Event title filter
  if (searchTerm) {
    query.title = {
      $regex: searchTerm,
      $options: "i",
    };
  }

  // Total count
  const total = await Event.countDocuments(query);

  // Fetch events
  const events = await Event.find(query)
    .populate("attendees", "fullName email image")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("title price attendees updatedAt");

  // Flatten payments
  const payments = events.flatMap((event) =>
    (event.attendees as any[]).map((attendee) => ({
      eventTitle: event.title,
      amount: event.price,
      user: attendee,
      paidAt: event.updatedAt,
    }))
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: payments,
  };
};
















//new api 

// ── Service ───────────────────────────────────────────────────────────────────
const getFeaturedEvents = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const total = await Event.countDocuments({
    isFeatured: true,
    isPast: false,
    isDeleted: false,
  });

  const events = await Event.find({
    isFeatured: true,
    isPast: false,
    isDeleted: false,
  })
    .populate("category", "name")
    .populate("host", "name profileImage")
    .populate("attendees", "profileImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("title date time location coverImage price isFeatured isPinned isHighlighted isTopEvent attendees category host");

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
 // ── Top Events ────────────────────────────────────────────────────────────────
const getTopEvents = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments({ isTopEvent: true, isPast: false, isDeleted: false });
 
  const events = await Event.find({ isTopEvent: true, isPast: false, isDeleted: false })
    .populate("category", "name")
    .populate("host", "name profileImage")
    .populate("attendees", "profileImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
 
  return { events, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};
 
// ── Highlighted Events ────────────────────────────────────────────────────────
const getHighlightedEvents = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments({ isHighlighted: true, isPast: false, isDeleted: false });
 
  const events = await Event.find({ isHighlighted: true, isPast: false, isDeleted: false })
    .populate("category", "name")
    .populate("host", "name profileImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
 
  return { events, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};
 
// ── Pinned Events ─────────────────────────────────────────────────────────────
const getPinnedEvents = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments({ isPinned: true, isPast: false, isDeleted: false });
 
  const events = await Event.find({ isPinned: true, isPast: false, isDeleted: false })
    .populate("category", "name")
    .populate("host", "name profileImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
 
  return { events, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};
 








// ── Home Page Events — কাছের events আগে, বাকিগুলো পরে ────────────────────────
// GET /api/v1/events/home?lng=90.4125&lat=23.8103&page=1&limit=10
const getHomeEvents = async (
  lng?: number,
  lat?: number,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;
 
  // location দিলে — কাছের events আগে
  if (lng && lat) {
    const events = await Event.find({
      isPast: false,
      isDeleted: false,
      "location.coordinates": { $exists: true, $ne: [] },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
        },
      },
    })
      .populate("category", "name")
      .populate("host", "fullName image")
      .populate("attendees", "image")
      .skip(skip)
      .limit(limit)
      .select(
        "title date time location coverImage price isFeatured isPinned isHighlighted isTopEvent eventType attendees category host"
      );
 
    // location ছাড়া events (string location যেমন "Dhaka")
    const eventsWithoutLocation = await Event.find({
      isPast: false,
      isDeleted: false,
      $or: [
        { "location.coordinates": { $exists: false } },
        { "location.coordinates": { $size: 0 } },
        { location: { $exists: false } },
      ],
    })
      .populate("category", "name")
      .populate("host", "fullName image")
      .populate("attendees", "image")
      .sort({ createdAt: -1 })
      .select(
        "title date time location coverImage price isFeatured isPinned isHighlighted isTopEvent eventType attendees category host"
      );
 
    // কাছের events আগে + বাকিগুলো পরে
    const allEvents = [...events, ...eventsWithoutLocation];
    const total = allEvents.length;
    const paginated = allEvents.slice(skip, skip + limit);
 
    return {
      events: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
 
  // location না দিলে — সব events newest first
  const total = await Event.countDocuments({
    isPast: false,
    isDeleted: false,
  });
 
  const events = await Event.find({
    isPast: false,
    isDeleted: false,
  })
    .populate("category", "name")
    .populate("host", "fullName image")
    .populate("attendees", "image")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      "title date time location coverImage price isFeatured isPinned isHighlighted isTopEvent eventType attendees category host"
    );
 
  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


// // event.service.ts
// const getEventReviews = async (eventId: string, page: number = 1, limit: number = 10) => {
//   if (!mongoose.Types.ObjectId.isValid(eventId)) {
//     throw new AppError(httpStatus.BAD_REQUEST, "Invalid event ID");
//   }

//   const event = await Event.findById(eventId)
//     .select("reviews")
//     .populate({
//       path: "reviews.user",
//       select: "name email profileImage",
//     });

//   if (!event) {
//     throw new AppError(httpStatus.NOT_FOUND, "Event not found");
//   }

//   const allReviews = (event.reviews ?? []).map((review) => {
//     const { _id, user, isAnonymous, rating, comment, images, createdAt, updatedAt } = review;

//     return {
//       _id,
//       rating,
//       comment,
//       images,
//       isAnonymous,
//       createdAt,
//       updatedAt,
//       user: isAnonymous ? null : user,
//     };
//   });

//   // pagination
//   const totalReviews = allReviews.length;
//   const totalPages = Math.ceil(totalReviews / limit);
//   const skip = (page - 1) * limit;
//   const reviews = allReviews.slice(skip, skip + limit);

//   return {

//     reviews,
//     meta: {
//       totalReviews,
//       totalPages,
//       currentPage: page,
//       limit,
//     },
   
//   };
// };







// const getEventReviews = async (
//   id: string,
//   type: string,
//   page: number = 1,
//   limit: number = 10
// ) => {
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new AppError(httpStatus.BAD_REQUEST, "Invalid ID");
//   }

//   let allReviews: any[] = [];

//   if (type === "product") {
//     const product = await Product.findById(id)
//       .select("reviews")
//       .populate({
//         path: "reviews.user",
//         select: "fullName email image",
//       });

//     if (!product) {
//       throw new AppError(httpStatus.NOT_FOUND, "Product not found");
//     }

//   allReviews = (product.reviews ?? []).map((review: any) => ({  // ✅ any দিন
//   _id: review._id,
//   rating: review.rating,
//   comment: review.comment,
//   createdAt: review.createdAt,
//   updatedAt: review.updatedAt,
//   user: review.user,
// }));
//   } else if (type === "event") {
//     const event = await Event.findById(id)
//       .select("reviews")
//       .populate({
//         path: "reviews.user",
//         select: "fullName email image",
//       });

//     if (!event) {
//       throw new AppError(httpStatus.NOT_FOUND, "Event not found");
//     }

//     allReviews = (event.reviews ?? []).map((review) => ({
//       _id: review._id,
//       rating: review.rating,
//       comment: review.comment,
//       images: review.images,
//       isAnonymous: review.isAnonymous,
//       createdAt: review.createdAt,
//       updatedAt: review.updatedAt,
//       user: review.isAnonymous ? null : review.user,
//     }));
//   }

//   // pagination
//   const totalReviews = allReviews.length;
//   const totalPages = Math.ceil(totalReviews / limit);
//   const skip = (page - 1) * limit;
//   const reviews = allReviews.slice(skip, skip + limit);

//   return {
//     type,
//     reviews,
//     meta: {
//       totalReviews,
//       totalPages,
//       currentPage: page,
//       limit,
//     },
//   };
// };



const getEventReviews = async (
  id: string,
  type: string,
  page: number = 1,
  limit: number = 10
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid ID");
  }

  let allReviews: any[] = [];

  if (type === "product") {
    const product = await Product.findById(id)
      .select("reviews")
      .populate({
        path: "reviews.user",
        select: "fullName email image",
      });

    if (!product) {
      throw new AppError(httpStatus.NOT_FOUND, "Product not found");
    }

    allReviews = (product.reviews ?? []).map((review: any) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user,
    }));

  } else if (type === "event") {
    const event = await Event.findById(id)
      .select("reviews")
      .populate({
        path: "reviews.user",
        select: "fullName email image",
      });

    if (!event) {
      throw new AppError(httpStatus.NOT_FOUND, "Event not found");
    }

    allReviews = (event.reviews ?? []).map((review: any) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      images: review.images,
      isAnonymous: review.isAnonymous,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.isAnonymous ? null : review.user,
    }));

  } else if (type === "user") {
    const user = await User.findById(id)
      .select("reviews")
      .populate({
        path: "reviews.reviewedBy",
        select: "fullName email image",
      });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    allReviews = (user.reviews ?? []).map((review: any) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewedBy: review.reviewedBy,
    }));
  }

  const totalReviews = allReviews.length;
  const totalPages = Math.ceil(totalReviews / limit);
  const skip = (page - 1) * limit;
  const reviews = allReviews.slice(skip, skip + limit);

  return {
    type,
    reviews,
    meta: {
      totalReviews,
      totalPages,
      currentPage: page,
      limit,
    },
  };
};








// const getEventReviewsnew = async (
//   eventId: string,
//   page: number = 1,
//   limit: number = 10
// ) => {

//   // ✅ Check Event ID
//   if (!mongoose.Types.ObjectId.isValid(eventId)) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       "Invalid Event ID"
//     );
//   }

//   // ✅ Find Event
//   const event = await Event.findById(eventId)
//     .select("reviews")
//     .populate([
//       {
//         path: "reviews.user",
//         select: "fullName email image",
//       },
//       {
//         path: "reviews.replies.user",
//         select: "fullName email image",
//       },
//     ]);

//   // ✅ Event Not Found
//   if (!event) {
//     throw new AppError(
//       httpStatus.NOT_FOUND,
//       "Event not found"
//     );
//   }

//   // ✅ Reviews Array
//   const reviews = event.reviews || [];

//   // ✅ Sort Latest Reviews First
//   const sortedReviews = [...reviews].sort((a: any, b: any) => {
//     return (
//       new Date(b.createdAt || 0).getTime() -
//       new Date(a.createdAt || 0).getTime()
//     );
//   });

//   // ✅ Pagination
//   const total = sortedReviews.length;

//   const totalPage = Math.ceil(total / limit);

//   const skip = (page - 1) * limit;

//   const paginatedReviews = sortedReviews.slice(
//     skip,
//     skip + limit
//   );

//   // ✅ Return
//   return {
//     data: paginatedReviews,

//     meta: {
//       page,
//       limit,
//       total,
//       totalPage,
//     },
//   };
// };

const getEventReviewsnew = async (
  eventId: string,
  page: number = 1,
  limit: number = 10
) => {
  // ✅ Validate Event ID
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid Event ID");
  }

  // ✅ Event খোঁজো + reviews populate করো
  const event = await Event.findById(eventId)
    .select("reviews")
    .populate([
      {
        path: "reviews.user",         // reviewer এর info
        select: "fullName email image",
      },
      {
        path: "reviews.replies.user", // reply দেওয়া user এর info
        select: "fullName email image",
      },
    ]);

  // ✅ Event না পেলে error
  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, "Event not found");
  }
const reviews = event.reviews || [];

// ✅ Latest আগে sort
const sortedReviews = [...reviews].sort((a: any, b: any) => {
  return (
    new Date(b.createdAt || 0).getTime() -
    new Date(a.createdAt || 0).getTime()
  );
});

// ✅ Pagination
const total = sortedReviews.length;
const totalPage = Math.ceil(total / limit);
const skip = (page - 1) * limit;
const paginatedReviews = sortedReviews.slice(skip, skip + limit);

// ✅ replies array → single reply object (latest টা নাও)
const formattedReviews = paginatedReviews.map((review: any) => {
  const reviewObj = review.toObject(); // Mongoose doc → plain object

  const latestReply =
    reviewObj.replies && reviewObj.replies.length > 0
      ? reviewObj.replies[reviewObj.replies.length - 1] // last reply
      : null;

  return {
    ...reviewObj,
    reply: latestReply, // single object
    replies: undefined, // replies array সরিয়ে দাও
  };
});

return {
  data: formattedReviews,
  meta: { page, limit, total, totalPage },
};
};


const getUpcomingEventsByHost = async (
  hostId: string,
  page = 1,
  limit = 10
) => {
  const skip = (page - 1) * limit;

  const query = {
    host: hostId,
    isDeleted: false,
    isPast: false,
  };

  const total = await Event.countDocuments(query);

  const events = await Event.find(query)
    .populate("host", "fullName email image")
    .populate("category", "name")
    .sort({ date: 1 })
    .skip(skip)
    .limit(limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: events,
  };
};




const getEventsByHost = async (
  hostId: string,
  page: number = 1,
  limit: number = 10,
  categoryId?: string, 
) => {
  const skip = (page - 1) * limit;

  const filter: any = {
    host: new Types.ObjectId(hostId),
    isDeleted: false,
    isPast:false,
  };

  // ✅ categoryId দিলে filter করবে, না দিলে সব আসবে
  if (categoryId && categoryId.trim() !== "") {
    filter.category = new Types.ObjectId(categoryId);
  }

  const total = await Event.countDocuments(filter);

  const events = await Event.find(filter)
    .populate("category", "name")
    .populate("host", "fullName email image")
    .populate("attendees", "fullName email image")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const addReplyToReview = async (
  userId: string,
  eventId: string,
  reviewId: string,
  comment: string,
) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }


  // ✅ Host check
  if (event.host.toString() !== userId.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only event host can reply');
  }

  const review = event.reviews?.find(
    (r: any) => r._id.toString() === reviewId.toString(),
  );




  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }

  const alreadyReplied = review.replies?.find(
    (r: any) => r.user.toString() === userId.toString(),
  );
  if (alreadyReplied) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already replied to this review',
    );
  }

  review.replies = review.replies || [];
review.replies.push({
  user: new Types.ObjectId(userId.toString()),
  comment: comment.trim(), // ✅ reply → comment
  isRead: false,
} as any);

  await event.save();
  await event.populate('reviews.replies.user', 'fullName email image');
  return review;
};


export const eventServices = {
createEventService,
getAllEventsService,
getPastEventsService,
getEventDetailsService,
updateEventService,
deleteEventService,
attendEventService,
addReviewService,
// search + extra features
 searchEvents,
  getFeaturedEvents,
  getNearbyEvents,
  getEventsByOrganizer,
  // getAllCategories,
  getUpcomingEvents,
  getPreviousEvents,
  getmapSuggestions,
  getsearchEvents,
  getDashboardStats,
  getAllMyEvents,
  getRecentPayments,
  getMyTicketnew,
  getTopEvents,
  getHighlightedEvents,
  getPinnedEvents,
  getHomeEvents,
  getEventReviews,
  getUpcomingEventsByHost,
  getEventReviewsnew,
  getEventsByHost,
  addReplyToReview
};
