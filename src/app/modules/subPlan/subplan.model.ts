// src/modules/subscription/subscription.model.ts
import { model, Schema } from 'mongoose';
import { TSubscriptionPlan } from './subplan.interface';


const SubscriptionPlanSchema = new Schema<TSubscriptionPlan>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    interval: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    trialDays: { type: Number, default: 0 },
    features: [{ type: String }],
    stripePriceId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const SubscriptionPlan = model<TSubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema,
);
export default SubscriptionPlan;