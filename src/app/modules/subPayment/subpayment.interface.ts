import { Types ,Model} from 'mongoose';




// ─── Checkout Session Payload ─────────────────────────────────────────────────
export type TCreateCheckoutPayload = {
  planId: string;
  promoCode?: string;
  successUrl?: string;
  cancelUrl?: string;
};
 
// ─── Subscription Status ──────────────────────────────────────────────────────
export type TSubscriptionStatus = 'active' | 'trialing' | 'expired' | 'cancelled' | 'none';
 
 
// ─── Payment Status ───────────────────────────────────────────────────────────
export type TPaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded';
 
// ─── Payment History Type ─────────────────────────────────────────────────────
export type TPaymentHistory = {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  plan: Types.ObjectId;
  promoCode?: Types.ObjectId | null;
  stripeSessionId: string;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  amount: number;       // cents e.g. 2999 = $29.99
  currency: string;
  status: TPaymentStatus;
  isTrial: boolean;
  trialDays?: number;
  paidAt?: Date;
};
 
// ─── Model Type ───────────────────────────────────────────────────────────────
export type PaymentHistoryModel = Model<TPaymentHistory>;
 