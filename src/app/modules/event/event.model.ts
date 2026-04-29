// event.model.ts
import { model, Schema,  } from "mongoose";
import { IEvent, IReview } from "./event.interface";

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    images: [
      {
        id: { type: String, default: "" },
        url: { type: String, default: "" },
      },
    ],
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
      category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, default: "" },
    // location: { type: String, default: "" },

    location: {
     type: {
       type: String,
      enum: ['Point'],
    // default: 'Point'
     },
     coordinates: {
      type: [Number],
    
    },
  },

    description: { type: String, default: "" },
    price: { type: Number, default: 0 },
    coverImage: {
      id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    gallery: [
      {
        id: { type: String },
        url: { type: String },
      },
    ],
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reviews: [reviewSchema],
    isPast: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },


      // ── Visibility Options (Figma) ────────────────────────────
    isHighlighted: { type: Boolean, default: false },  // Highlight Event
    isPinned: { type: Boolean, default: false },        // Pin Event
    isFeatured: { type: Boolean, default: false },      // Feature Placement
    isTopEvent: { type: Boolean, default: false },      // Top Event
 
    // Event type
    eventType: {
      type: String,
      enum: ["Free Event", "Paid Event"],
      default: "Free Event",
    },








  },
  {
    timestamps: true,
    versionKey: false,
  }
);


eventSchema.index({ location: "2dsphere" });
// filter deleted events automatically
eventSchema.pre("find", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});
eventSchema.pre("findOne", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Event = model<IEvent>("Event", eventSchema);


// ← এখানে add করো, উপরে না
Event.schema.post("find", async function (docs: any[]) {
  const now = new Date();
  for (const doc of docs) {
    if (!doc.isPast) {
      const eventDateTime = new Date(doc.date);
      if (doc.time) {
        const [hours, minutes] = doc.time.split(":").map(Number);
        eventDateTime.setHours(hours, minutes, 0, 0);
      }
      if (eventDateTime < now) {
        await Event.updateOne({ _id: doc._id }, { $set: { isPast: true } });
        doc.isPast = true;
      }
    }
  }
});