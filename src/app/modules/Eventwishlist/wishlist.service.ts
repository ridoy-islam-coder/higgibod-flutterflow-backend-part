// event.wishlist.service.ts

import { EventWishlist } from "./wishlist.model";



const getEventWishlist = async (userId: string) => {
  const wishlist = await EventWishlist.findOne({ user: userId }).populate(
    "events",
    "title date time location coverImage category price isPast"
  );
  return wishlist || { user: userId, events: [] };
};


const toggleEventWishlist = async (userId: string, eventId: string) => {
  let wishlist = await EventWishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = await EventWishlist.create({ user: userId, events: [] });
  }

  const index = wishlist.events.findIndex(
    (e: any) => e.toString() === eventId
  );

  let action: "added" | "removed";

  if (index > -1) {
    wishlist.events.splice(index, 1);
    action = "removed";
  } else {
    wishlist.events.push(eventId as any);
    action = "added";
  }

  await wishlist.save();

  return {
    action,
    wishlist: await wishlist.populate(
      "events",
      "title date time location coverImage category price isPast"
    ),
  };
};


const removeEventFromWishlist = async (userId: string, eventId: string) => {
  return await EventWishlist.findOneAndUpdate(
    { user: userId },
    { $pull: { events: eventId } },
    { new: true }
  ).populate("events", "title date time location coverImage category price isPast");
};


export const eventWishlistService = {
  getEventWishlist,
  toggleEventWishlist,
  removeEventFromWishlist,
};