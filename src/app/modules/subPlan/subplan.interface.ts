
import { Document } from 'mongoose';
 
export interface IPlan extends Document {
  name: 'Starter' | 'Pro';
  description: string;
  price: {
    monthly: number;
    threeMonth: number;
    sixMonth: number;
    yearly: number;
  };
  features: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
 
export type TBillingInterval = 'monthly' | 'threeMonth' | 'sixMonth' | 'yearly';
 