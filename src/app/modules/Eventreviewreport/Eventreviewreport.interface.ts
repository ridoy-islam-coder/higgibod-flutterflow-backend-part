import { Types } from "mongoose";

export type TReportReason =
  | "Spam"
  | "Inappropriate content"
  | "Fake review"
  | "Hate speech"
  | "Other";

export type TReportStatus = "pending" | "resolved" | "dismissed";

export interface IEventReviewReport {
  _id?: Types.ObjectId;
  event: Types.ObjectId;
  review: Types.ObjectId;
  reportedBy: Types.ObjectId;
  reason: TReportReason;
  status: TReportStatus;
  createdAt?: Date;
  updatedAt?: Date;
}