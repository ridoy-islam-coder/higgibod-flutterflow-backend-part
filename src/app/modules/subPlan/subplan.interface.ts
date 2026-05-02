import { Model, Types } from 'mongoose';

// ─── Plan Name Type ──────────────────────────────────────────────────────────
export type TPlanName = 'starter' | 'pro';
export type TInterval = 'month' | 'year';

// ─── Subscription Plan Type ──────────────────────────────────────────────────
export type TSubscriptionPlan = {
  _id?: Types.ObjectId;
  name: TPlanName;
  description: string;
  price: number; // in cents → 2999 = $29.99
  currency: string;
  interval: TInterval;
  trialDays: number;
  stripePriceId: string;
  features: string[];
  isActive: boolean;
  role: "ORGANIZER" | "MARCHANT" | "KAATEDJ";
};

// ─── Model Type ──────────────────────────────────────────────────────────────
export type SubscriptionPlanModel = Model<TSubscriptionPlan>;