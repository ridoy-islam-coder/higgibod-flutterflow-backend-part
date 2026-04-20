// src/modules/promoCode/promoCode.interface.ts
import { Types } from 'mongoose';

export type TPromoCode = {
  _id?: Types.ObjectId;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_trial';
  discountValue: number;       // percentage বা fixed amount
  trialDays?: number;          // free_trial হলে কত দিন
  applicablePlans: Types.ObjectId[]; 
  maxUses: number;           
  usedCount: number;
  isActive: boolean;
  expiresAt?: Date;
  createdBy: Types.ObjectId;   // Admin
};