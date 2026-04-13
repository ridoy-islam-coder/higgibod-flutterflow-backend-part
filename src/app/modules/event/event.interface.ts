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

export interface IEvent extends Document {
  title: string;
  category?: string;
  date: Date;
  time?: string;
  location?: string;
  description?: string;
  price?: number;
  coverImage?: IImageFile;  // ← updated
  gallery?: IImageFile[];   // ← updated
  host: Types.ObjectId;
  attendees?: Types.ObjectId[];
  reviews?: IReview[];
  isPast?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}