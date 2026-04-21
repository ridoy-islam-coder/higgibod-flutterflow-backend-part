
import mongoose, { Schema } from 'mongoose';
import { IPlan } from './subplan.interface';
 
const PlanSchema: Schema = new Schema(
  {
    name: {
      type: String,
      enum: ['Starter', 'Pro'],
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      monthly: { type: Number, required: true },
      threeMonth: { type: Number, required: true },
      sixMonth: { type: Number, required: true },
      yearly: { type: Number, required: true },
    },
    features: [
      {
        type: String,
      },
    ],
    currency: {
    ctype: String,
    default: "usd",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);
 
export default mongoose.model<IPlan>('Plan', PlanSchema);
 