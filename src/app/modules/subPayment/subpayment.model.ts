import { model, Schema } from 'mongoose';
import { PaymentHistoryModel, TPaymentHistory } from './subpayment.interface';


// ─── Schema ───────────────────────────────────────────────────────────────────
const PaymentHistorySchema = new Schema<TPaymentHistory, PaymentHistoryModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    promoCode: {
      type: Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeSubscriptionId: {
      type: String,
    },
    stripeInvoiceId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true, // cents
    },
    currency: {
      type: String,
      default: 'usd',
    },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'pending', 'refunded'],
      default: 'pending',
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Model ────────────────────────────────────────────────────────────────────
const PaymentHistory = model<TPaymentHistory, PaymentHistoryModel>(
  'PaymentHistory',
  PaymentHistorySchema,
);

export default PaymentHistory;