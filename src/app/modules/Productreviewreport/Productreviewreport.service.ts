import AppError from "../../error/AppError";
import { Product } from "../product/product.model";

import httpStatus from "http-status";
import { ProductReviewReport } from "./Productreviewreport.model";

// ── 1. Report Product Review (Host/User) ──────────────────────────────────────
const reportProductReview = async (
  reportedBy: string,
  productId: string,
  reviewId: string,
  reason: string
) => {
  const product = await Product.findById(productId);
  if (!product) throw new AppError(httpStatus.NOT_FOUND, "Product not found");

  const review = product.reviews?.find(
    (r: any) => r._id.toString() === reviewId
  );
  if (!review) throw new AppError(httpStatus.NOT_FOUND, "Review not found");

  const alreadyReported = await ProductReviewReport.findOne({
    product: productId,
    review: reviewId,
    reportedBy,
  });
  if (alreadyReported) {
    throw new AppError(httpStatus.CONFLICT, "You have already reported this review");
  }

  const report = await ProductReviewReport.create({
    product: productId,
    review: reviewId,
    reportedBy,
    reason,
  });

  return report;
};

// ── 2. Get All Reports (Admin) ────────────────────────────────────────────────
const getAllProductReviewReports = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  const total = await ProductReviewReport.countDocuments({ status: "pending" });

  const reports = await ProductReviewReport.find({ status: "pending" })
    .populate("product", "name images")
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
const deleteProductReview = async (reportId: string) => {
  const report = await ProductReviewReport.findById(reportId);
  if (!report) throw new AppError(httpStatus.NOT_FOUND, "Report not found");

  await Product.findByIdAndUpdate(report.product, {
    $pull: { reviews: { _id: report.review } },
  });

  await ProductReviewReport.findByIdAndUpdate(reportId, {
    $set: { status: "resolved" },
  });

  return { message: "Review deleted successfully" };
};

// ── 4. Dismiss Report (Admin) ─────────────────────────────────────────────────
const dismissProductReviewReport = async (reportId: string) => {
  const report = await ProductReviewReport.findByIdAndUpdate(
    reportId,
    { $set: { status: "dismissed" } },
    { new: true }
  );
  if (!report) throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  return report;
};

export const ProductReviewReportService = {
  reportProductReview,
  getAllProductReviewReports,
  deleteProductReview,
  dismissProductReviewReport,
};