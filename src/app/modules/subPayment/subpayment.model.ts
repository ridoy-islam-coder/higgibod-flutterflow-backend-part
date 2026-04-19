import { Schema, model } from "mongoose";
import { IPayment } from "./subpayment.interface";

const paymentSchema = new Schema<IPayment>(
  {
  user: {
  type: Schema.Types.ObjectId,
  ref: "User",
  required: true,
},
 plan: {
  type: Schema.Types.ObjectId,
  ref: "SubscriptionPlan",
  required: true,
},

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      required: true,
      default: "USD",
    },

    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "manual"],
      required: true,
    },

    stripePaymentIntentId: {
      type: String,
    },

    promoCode: {
      type: String,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = model<IPayment>("Payment", paymentSchema);

export default Payment;