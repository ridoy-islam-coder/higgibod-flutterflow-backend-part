// src/modules/subscription/subscription.interface.ts
import { Types } from 'mongoose';

export type TSubscriptionPlan = {
  _id?: Types.ObjectId;
  name: string;               // Basic, Pro, Enterprise
  price: number;              // USD
  currency: string;
  interval: 'monthly' | 'yearly';
  trialDays: number;          // default free trial days
  features: string[];
  stripePriceId: string;      // Stripe এ create করা Price ID
  isActive: boolean;
};