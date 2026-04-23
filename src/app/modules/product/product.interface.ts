// product.interface.ts
import { Document, Types } from "mongoose";

export interface IImageFile {
  id: string;
  url: string;
}

export interface IReview {
  user: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProduct extends Document {
  name: string;
  category: Types.ObjectId;
  description?: string;
  price: number;
  discount?: number;
  tax?: number;
  shippingCost?: number;
  colors?: string[];
  sizes?: string[];
  images?: IImageFile[];
  host: Types.ObjectId;
  reviews?: IReview[];
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}