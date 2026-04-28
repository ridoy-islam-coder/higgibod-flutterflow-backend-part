import express from "express";

import { USER_ROLE } from "../user/user.constant";
import { ProductReviewReportController } from "./Productreviewreport.controller";
import auth from "../../middleware/auth.middleware";

const router = express.Router();

// POST /api/v1/product-reviews/:productId/:reviewId/report
router.post(
  "/report",
  auth( USER_ROLE.MARCHANT),
  ProductReviewReportController.reportProductReview
);

// GET /api/v1/product-reviews/admin/reports
router.get(
  "/admin/reports",
  auth(USER_ROLE.admin),
  ProductReviewReportController.getAllReports
);

// DELETE /api/v1/product-reviews/admin/reports/:reportId
router.delete(
  "/admin/reports/:reportId",
  auth(USER_ROLE.admin),
  ProductReviewReportController.deleteProductReview
);

// PATCH /api/v1/product-reviews/admin/reports/:reportId/dismiss
router.patch(
  "/admin/reports/:reportId/dismiss",
  auth(USER_ROLE.admin),
  ProductReviewReportController.dismissReport
);

export const ProductReviewReportRoutes = router;