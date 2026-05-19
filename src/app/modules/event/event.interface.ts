// import { Types } from "mongoose";

// export interface IReviewImage {
//   id: string;
//   url: string;
// }

// export interface IReview {
//   _id?: Types.ObjectId;
//   user: Types.ObjectId;
//   rating: number;
//   comment: string;
//   images?: IReviewImage[];   // ✅ image support added
//   isAnonymous?: boolean;     // ✅ anonymous posting support
//   createdAt?: Date;
//   updatedAt?: Date;
// }

// export interface ILocation {
//   type: "Point";
//   coordinates: [longitude: number, latitude: number]; // [lng, lat]
// }



// export interface IEvent {
//   _id?: Types.ObjectId;
//   title: string;
//   category?: Types.ObjectId;
//   date: Date;
//   time?: string;
//   location?: ILocation;
//   description?: string;
//   price?: number;
//   coverImage?: { id: string; url: string };
//   gallery?: { id: string; url: string }[];
//   host: Types.ObjectId;
//   attendees?: Types.ObjectId[];
//   reviews?: IReview[];
//   isPast?: boolean;
//   isDeleted?: boolean;
 
//   // ── Visibility Options (Figma) ────────────────────────────
//   isFeatured?: boolean;     // Feature Placement
//   isPinned?: boolean;       // Pin Event
//   isHighlighted?: boolean;  // Highlight Event
//   isTopEvent?: boolean;     // Top Event
 
//   // ── Event Type ────────────────────────────────────────────
//   eventType?: "Free Event" | "Paid Event";
 
//   createdAt?: Date;
//   updatedAt?: Date;
// }


import { Types } from "mongoose";

export interface IReviewImage {
  id: string;
  url: string;
}

// ✅ নতুন — Reply interface
export interface IReply {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  comment: string;
  isRead:boolean
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReview {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment: string;
  images?: IReviewImage[];
  isAnonymous?: boolean;
  replies?: IReply[]; // ✅ নতুন
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILocation {
  type: "Point";
  coordinates: [longitude: number, latitude: number];
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

  // ── Visibility Options ────────────────────────────────────
  isFeatured?: boolean;
  isPinned?: boolean;
  isHighlighted?: boolean;
  isTopEvent?: boolean;
skiteeventType:string,
  // ── Event Type ────────────────────────────────────────────
  eventType?: "Free Event" | "Paid Event";

  createdAt?: Date;
  updatedAt?: Date;
}