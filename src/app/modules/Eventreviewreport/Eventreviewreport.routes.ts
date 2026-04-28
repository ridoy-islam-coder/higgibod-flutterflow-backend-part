import express from "express";

import { USER_ROLE } from "../user/user.constant";
import auth from "../../middleware/auth.middleware";
import { EventReviewReportController } from "./Eventreviewreport.controller";

const router = express.Router();

// ── Organizer — report a review ───────────────────────────────────────────────
// POST /api/v1/event-reviews/:eventId/:reviewId/report
router.post(
  "/:eventId/:reviewId/report",
  auth(USER_ROLE.ORGANIZER),
  EventReviewReportController.reportEventReview
);

// ── Admin — get all reports ───────────────────────────────────────────────────
// GET /api/v1/event-reviews/admin/reports
router.get(
  "/admin/reports",
  auth(USER_ROLE.admin),
  EventReviewReportController.getAllReports
);

// ── Admin — delete review ─────────────────────────────────────────────────────
// DELETE /api/v1/event-reviews/admin/reports/:reportId
router.delete(
  "/admin/reports/:reportId",
  auth(USER_ROLE.admin),
  EventReviewReportController.deleteEventReview
);

// ── Admin — dismiss report ────────────────────────────────────────────────────
// PATCH /api/v1/event-reviews/admin/reports/:reportId/dismiss
router.patch(
  "/admin/reports/:reportId/dismiss",
  auth(USER_ROLE.admin),
  EventReviewReportController.dismissReport
);

export const EventReviewReportRoutes = router;