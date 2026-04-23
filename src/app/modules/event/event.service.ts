import axios from "axios";
import AppError from "../../error/AppError";
import { deleteManyFromS3, uploadToS3 } from "../../utils/fileHelper";
import { Event } from "./event.model";
import config from "../../config";




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

    longitude,
    latitude,
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
  });

  return event;
};


export const getAllEventsService = async () => {
  // const page = Number(query.page) || 1;
  // const limit = Number(query.limit) || 10;
  // const skip = (page - 1) * limit;

  const filter = {
    isPast: false,
    date: { $gte: new Date() },
  };

  const events = await Event.find(filter)
    .select("title  date time  location  attendees gallery gallery coverImage")
    .populate("host", "fullName image")
    .populate("attendees", "name email profileImage")
    
    // .sort({ date: 1 })
    // .skip(skip)
    // .limit(limit);

  const total = await Event.countDocuments(filter);

  return {
    // meta: {
    //   page,
    //   limit,
    //   total,
    //   totalPage: Math.ceil(total / limit),
    // },
    data: events,
  };
};



// event.getPastEvents
export const getPastEventsService = async () => {
  const events = await Event.find({
    date: { $lt: new Date() },
  })
    .select("title  date time  location  attendees gallery gallery coverImage")
    .populate("host", "fullName image")
    .populate("attendees", "name email profileImage")
    .sort({ date: -1 });
  return events;
};


// event.getEventDetails
export const getEventDetailsService = async (id: string) => {
  const event = await Event.findById(id)
    .populate("host", "fullName image")
    .populate("attendees", "fullName image")
    .populate("reviews.user", "fullName image");
  if (!event) throw new AppError(404, "Event not found");
  return event;
};




// event.updateEvent
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
    location,
    description,
    price,
  } = req.body;

  const updateData: any = {
    ...(title && { title }),
    ...(category && { category }),
    ...(date && { date }),
    ...(time && { time }),
    ...(location && { location }),
    ...(description && { description }),
    ...(price && { price }),
    ...(coverImage && { coverImage }),
    ...(gallery && gallery.length > 0 && { gallery }),
  };

  const event = await Event.findByIdAndUpdate(id, updateData, { new: true });
  if (!event) throw new AppError(404, "Event not found");
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



















const searchEvents = async (query: {
  q?: string;
  category?: string;
  country?: string;
  eventType?: string;
  minPrice?: number;
  maxPrice?: number;
  date?: string;
  organizer?: string;
  page?: number;
  limit?: number;
}) => {
  const {
    q,
    category,
    country,
    eventType,
    minPrice,
    maxPrice,
    date,
    organizer,
    page = 1,
    limit = 10,
  } = query;
 
  const filter: Record<string, any> = { isDeleted: { $ne: true } };
 
  // Keyword search (title + description)
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }
 
  if (category) filter.category = { $regex: category, $options: "i" };
  if (country) filter.location = { $regex: country, $options: "i" };
  if (eventType) filter.category = eventType; // map eventType to category
  if (organizer) filter.host = organizer;
 
  // Price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
 
  // Date filter
  if (date) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.date = { $gte: targetDate, $lt: nextDay };
  }
 
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments(filter);
  const events = await Event.find(filter)
    .select("title  date time  location  attendees gallery gallery coverImage")
    .populate("host", "name email profileImage")
    .populate("attendees", "name email profileImage")
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
 
const getFeaturedEvents = async () => {
  // Featured = upcoming events with most attendees
  return await Event.find({
    isDeleted: { $ne: true },
    isPast: false,
    date: { $gte: new Date() },
  })
    .populate("host", "name profileImage")
    .sort({ attendees: -1, date: 1 })
    .limit(5);
};
 
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
 





 export const getAllCategories = async () => {
  const categories = await Event.distinct("category");

  // empty string remove (optional clean)
  return categories.filter((cat) => cat && cat.trim() !== "");
};






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
  getAllCategories,
  getUpcomingEvents,
  getPreviousEvents,
  getmapSuggestions,
  getsearchEvents,

};
