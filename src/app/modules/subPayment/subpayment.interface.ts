import { Types } from 'mongoose';

export type TBillingCycle = 'monthly' | 'threeMonth' | 'sixMonth' | 'yearly';
export type TPaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type TPaymentMethod = 'stripe' | 'paypal' | 'manual';

export interface IPayment {
  user: Types.ObjectId;
  plan: Types.ObjectId;
  planName: 'Starter' | 'Pro';          // ← plan name directly save
  billingCycle: TBillingCycle;           // ← কোন cycle এ কিনেছে
  amount: number;
  currency: string;
  status: TPaymentStatus;
  paymentMethod: TPaymentMethod;
  stripePaymentIntentId?: string;
  promoCode?: string;
  discountAmount?: number;
  isTrial?: boolean;
  periodStart: Date;
  periodEnd: Date;
}