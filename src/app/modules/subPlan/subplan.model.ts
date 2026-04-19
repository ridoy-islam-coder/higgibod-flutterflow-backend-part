import { Schema, model } from "mongoose";
import { IPlan } from "./subplan.interface";


const planSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    interval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    features: {
      type: [String],
      required: true,
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    isActive: {
    type: Boolean,
    default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Plan = model<IPlan>("Plan", planSchema);

export default Plan;