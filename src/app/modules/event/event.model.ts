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
    category: { type: String, default: "" },
    date: { type: Date, required: true },
    time: { type: String, default: "" },
    location: { type: String, default: "" },
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

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