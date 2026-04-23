import { Types } from "mongoose";

export interface IReviewImage {
  id: string;
  url: string;
}

export interface IReview {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment: string;
  images?: IReviewImage[];   // ✅ image support added
  isAnonymous?: boolean;     // ✅ anonymous posting support
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILocation {
  type: "Point";
  coordinates: [longitude: number, latitude: number]; // [lng, lat]
}


export interface IEvent {
  _id?: Types.ObjectId;
  title: string;
  category?: Types.ObjectId;
  date: Date;
  time?: string;
  location?: ILocation;
  description?: string;
  price?: number;
  coverImage?: { id: string; url: string };
  gallery?: { id: string; url: string }[];
  host: Types.ObjectId;
  attendees?: Types.ObjectId[];
  reviews?: IReview[];
  isPast?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}