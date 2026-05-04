import { Event } from "../modules/event/event.model";

export const updatePastEvents = async () => {
  const now = new Date();
  await Event.updateMany(
    {
      isPast: false,
      isDeleted: false,
      date: { $lt: now },
    },
    { $set: { isPast: true } }
  );
};