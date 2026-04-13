import AppError from "../../error/AppError";
import { Event } from "./event.model";


// event.create
export const createEventService = async (
  req: any,
  coverImage?: { id: string; url: string },
  gallery?: { id: string; url: string }[]
) => {
  const userId = req.user?.id;
  const {
    title,
    category,
    date,
    time,
    location,
    description,
    price,
  } = req.body;

  if (!title || !date) {
    throw new AppError(400, 'Title and date are required');
  }

  const event = await Event.create({
    title,
    category: category || "",
    date,
    time: time || "",
    location: location || "",
    description: description || "",
    price: price || 0,
    coverImage: coverImage || { id: "", url: "" },
    gallery: gallery || [],
    host: userId,
  });

  return event;
};





// event.getAllEvents
export const getAllEventsService = async () => {
  const events = await Event.find({
    isPast: false,
    date: { $gte: new Date() },
  })
    .populate("host", "fullName image")
    .sort({ date: 1 });
  return events;
};




// event.getPastEvents
export const getPastEventsService = async () => {
  const events = await Event.find({
    date: { $lt: new Date() },
  })
    .populate("host", "fullName image")
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



export const eventServices = {
createEventService,
getAllEventsService,
getPastEventsService,
getEventDetailsService,
updateEventService,
deleteEventService,
attendEventService,
addReviewService,
};
