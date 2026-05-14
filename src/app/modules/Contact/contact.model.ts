import mongoose, { Schema } from "mongoose";
import { IContactDocument } from "./contact.interface";


const contactSchema = new Schema<IContactDocument>(
  {
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        "Invalid phone number format",
      ],
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: null,
      match: [
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        "Invalid alternate phone number format",
      ],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "read", "replied"],
      default: "pending",
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1 });

export const Contact = mongoose.model<IContactDocument>("Contact", contactSchema);