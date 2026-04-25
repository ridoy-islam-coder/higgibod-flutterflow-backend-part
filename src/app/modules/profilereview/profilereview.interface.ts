import {  Types, Document } from 'mongoose';

export interface IReview extends Document {
  organizer: Types.ObjectId;
  reviewer: Types.ObjectId;
  rating: number;
  comment: string;
  image?: { id: string; url: string };
  isAnonymous: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TReportReason =
  | 'Just to let you know this might be a problem'
  | 'Disrespectful and harmful behavior'
  | "Violating platform's harassment policy";

export interface IReport extends Document {
  review: Types.ObjectId;
  reportedBy: Types.ObjectId;
  reason: TReportReason;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}