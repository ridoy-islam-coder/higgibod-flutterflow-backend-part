import AppError from "../../error/AppError";
import { Event } from "../event/event.model";

import httpStatus from "http-status";
import { EventReviewReport } from "./Eventreviewreport.model";


// ── 1. Report Event Review (Organizer) ───────────────────────────────────────
const reportEventReview = async (
  organizerId: string,
  eventId: string,
  reviewId: string,
  reason: string
) => {
  // Event আছে কিনা check
  const event = await Event.findById(eventId);
  if (!event) throw new AppError(httpStatus.NOT_FOUND, "Event not found");

  // Review আছে কিনা check
  const review = event.reviews?.find(
    (r: any) => r._id.toString() === reviewId
  );
  if (!review) throw new AppError(httpStatus.NOT_FOUND, "Review not found");

  // Already report করা আছে কিনা
  const alreadyReported = await EventReviewReport.findOne({
    event: eventId,
    review: reviewId,
    reportedBy: organizerId,
  });
  if (alreadyReported) {
    throw new AppError(httpStatus.CONFLICT, "You have already reported this review");
  }

  const report = await EventReviewReport.create({
    event: eventId,
    review: reviewId,
    reportedBy: organizerId,
    reason,
  });

  return report;
};

// ── 2. Get All Reports (Admin) ────────────────────────────────────────────────
const getAllEventReviewReports = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  const total = await EventReviewReport.countDocuments({ status: "pending" });

  const reports = await EventReviewReport.find({ status: "pending" })
    .populate("event", "title coverImage")
    .populate("reportedBy", "fullName image email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    reports,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ── 3. Delete Review (Admin) ──────────────────────────────────────────────────
const deleteEventReview = async (reportId: string) => {
  const report = await EventReviewReport.findById(reportId);
  if (!report) throw new AppError(httpStatus.NOT_FOUND, "Report not found");

  // Event থেকে review টা pull করো
  await Event.findByIdAndUpdate(report.event, {
    $pull: { reviews: { _id: report.review } },
  });

  // Report status resolved করো
  await EventReviewReport.findByIdAndUpdate(reportId, {
    $set: { status: "resolved" },
  });

  return { message: "Review deleted successfully" };
};

// ── 4. Dismiss Report (Admin) ─────────────────────────────────────────────────
const dismissEventReviewReport = async (reportId: string) => {
  const report = await EventReviewReport.findByIdAndUpdate(
    reportId,
    { $set: { status: "dismissed" } },
    { new: true }
  );
  if (!report) throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  return report;
};

export const EventReviewReportService = {
  reportEventReview,
  getAllEventReviewReports,
  deleteEventReview,
  dismissEventReviewReport,
};