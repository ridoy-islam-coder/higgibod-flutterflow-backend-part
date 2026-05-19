// import {  Types, Document } from 'mongoose';

// export interface IReview extends Document {
//   organizer: Types.ObjectId;
//   reviewer: Types.ObjectId;
//   rating: number;
//   comment: string;
//   image?: { id: string; url: string };
//   isAnonymous: boolean;
//   isDeleted: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface IReview {

//   reply?: {
//     organizer: Types.ObjectId;
//     comment: string;
//   } | null;
// }

// export type TReportReason =
//   | 'Just to let you know this might be a problem'
//   | 'Disrespectful and harmful behavior'
//   | "Violating platform's harassment policy";

// export interface IReport extends Document {
//   review: Types.ObjectId;
//   reportedBy: Types.ObjectId;
//   reason: TReportReason;
//   status: 'pending' | 'resolved';
//   createdAt: Date;
//   updatedAt: Date;
// }


// profilereview.interface.ts
import { Types } from 'mongoose';

export interface IReply {
  organizer: Types.ObjectId;
  comment: string;
  isRead: boolean;       // ✅ নতুন
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReview {
  _id?: Types.ObjectId;
  organizer: Types.ObjectId;
  reviewer: Types.ObjectId;
  rating: number;
  comment: string;
  image?: { id: string; url: string } | null;
  isAnonymous: boolean;
  isDeleted: boolean;
  reply?: IReply | null;  // ✅ IReply type use করো
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReport {
  _id?: Types.ObjectId;
  review: Types.ObjectId;
  reportedBy: Types.ObjectId;
  reason:
    | 'Just to let you know this might be a problem'
    | 'Disrespectful and harmful behavior'
    | "Violating platform's harassment policy";
  status: 'pending' | 'resolved';
  createdAt?: Date;
  updatedAt?: Date;
}