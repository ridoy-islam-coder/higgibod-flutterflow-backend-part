// src/modules/promoCode/promoCode.model.ts
import { model, Schema } from 'mongoose';
import { TPromoCode } from './promocode.interface';

const PromoCodeSchema = new Schema<TPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'free_trial'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      default: 0,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    applicablePlans: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subscription',
      },
    ],
    maxUses: {
      type: Number,
      required: true,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

const PromoCode = model<TPromoCode>('PromoCode', PromoCodeSchema);
export default PromoCode;