import mongoose, { Schema } from "mongoose";
import { ContactStatus, IContactDocument } from "./contact.interface";


// ========================================
// Contact Schema
// ========================================
const ContactSchema = new Schema<IContactDocument>(
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
      enum: ["pending", "read", "replied"] as ContactStatus[],
      default: "pending" as ContactStatus,
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

// ========================================
// Indexes
// ========================================
ContactSchema.index({ createdAt: -1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ phoneNumber: 1 });

// ========================================
// Export Model
// ========================================
const ContactModel = mongoose.model<IContactDocument>("Contact", ContactSchema);

export default ContactModel;