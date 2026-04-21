import { Schema, model } from 'mongoose';
import { IPayment } from './subpayment.interface';

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    // ← Plan name directly save — user দেখলেই বুঝবে কোন plan
    planName: {
      type: String,
      enum: ['Starter', 'Pro'],
      required: true,
    },
    // ← কোন billing cycle এ কিনেছে
    billingCycle: {
      type: String,
      enum: ['monthly', 'threeMonth', 'sixMonth', 'yearly'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'manual'],
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    promoCode: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    isTrial: {
      type: Boolean,
      default: false,
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
  { timestamps: true },
);

const Payment = model<IPayment>('Payment', paymentSchema);
export default Payment;