import { Types } from "mongoose";

export interface IPayment {
  user: Types.ObjectId;
  plan: Types.ObjectId;

  amount: number;
  currency: string;

  status: "pending" | "succeeded" | "failed" | "refunded";

  paymentMethod: "stripe" | "paypal" | "manual";

  stripePaymentIntentId?: string;

  promoCode?: string;
  discountAmount?: number;

  periodStart: Date;
  periodEnd: Date;
}