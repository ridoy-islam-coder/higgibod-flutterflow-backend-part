import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { Report, Review } from './profilereview.model';
import { deleteFromS3, uploadToS3 } from '../../utils/fileHelper';
import { TReportReason } from './profilereview.interface';


// ─── 1. Write Review ───────────────────────────────────────────────────────────
const createReview = async (
  reviewerId: string,
  payload: {
    organizer: string;
    rating: number;
    comment: string;
    isAnonymous?: boolean;
  },
  file?: Express.Multer.File,
) => {
  const alreadyReviewed = await Review.findOne({
    reviewer: reviewerId,
    organizer: payload.organizer,
  });
  if (alreadyReviewed) {
    throw new AppError(httpStatus.CONFLICT, 'You have already reviewed this organizer');
  }

  let imageData = {};
  if (file) {
    const uploaded = await uploadToS3(file, 'reviews');
    imageData = { image: { id: uploaded.id, url: uploaded.url } };
  }

  const result = await Review.create({
    ...payload,
    reviewer: reviewerId,
    ...imageData,
  });

  return result.populate([
    { path: 'reviewer', select: 'fullName image' },
    { path: 'organizer', select: 'fullName image' },
  ]);
};

// ─── 2. Get Organizer Reviews ──────────────────────────────────────────────────
const getOrganizerReviews = async (
  organizerId: string,
  page = 1,
  limit = 10,
) => {
  const skip = (page - 1) * limit;

  const total = await Review.countDocuments({
    organizer: organizerId,
    isDeleted: { $ne: true },
  });

  const reviews = await Review.find({ organizer: organizerId })
    .populate('reviewer', 'fullName image')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .then((docs) =>
      docs.map((doc) => ({
        ...doc,
        reviewer: doc.isAnonymous ? null : doc.reviewer,
      })),
    );

  const ratingData = await Review.aggregate([
    {
      $match: {
        organizer: { $toObjectId: organizerId },
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        total: { $sum: 1 },
      },
    },
  ]);

  const avgRating = ratingData[0]?.avgRating?.toFixed(1) || 0;

  return {
    reviews,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    avgRating,
  };
};

// ─── 3. Report Review ─────────────────────────────────────────────────────────
const reportReview = async (
  reportedBy: string,
  reviewId: string,
  reason: TReportReason,
) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError(httpStatus.NOT_FOUND, 'Review not found');

  const alreadyReported = await Report.findOne({ review: reviewId, reportedBy });
  if (alreadyReported) {
    throw new AppError(httpStatus.CONFLICT, 'You have already reported this review');
  }

  const result = await Report.create({ review: reviewId, reportedBy, reason });
  return result;
};

// ─── 4. Admin: Get All Reports ─────────────────────────────────────────────────
const getAllReports = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const total = await Report.countDocuments({ status: 'pending' });

  const reports = await Report.find({ status: 'pending' })
    .populate({
      path: 'review',
      populate: [
        { path: 'reviewer', select: 'fullName image' },
        { path: 'organizer', select: 'fullName image' },
      ],
    })
    .populate('reportedBy', 'fullName image')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    reports,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── 5. Admin: Remove Review ───────────────────────────────────────────────────
const removeReview = async (reportId: string) => {
  const report = await Report.findById(reportId).populate('review');
  if (!report) throw new AppError(httpStatus.NOT_FOUND, 'Report not found');

  const review = report.review as any;

  if (review?.image?.id) {
    await deleteFromS3(review.image.id);
  }

  await Review.findByIdAndUpdate(review._id, { isDeleted: true });
  await Report.findByIdAndUpdate(reportId, { status: 'resolved' });

  return { message: 'Review removed successfully' };
};

// ─── 6. Admin: Dismiss Report ──────────────────────────────────────────────────
const dismissReport = async (reportId: string) => {
  const report = await Report.findById(reportId);
  if (!report) throw new AppError(httpStatus.NOT_FOUND, 'Report not found');

  await Report.findByIdAndUpdate(reportId, { status: 'resolved' });
  return { message: 'Report dismissed successfully' };
};

export const reviewServices = {
  createReview,
  getOrganizerReviews,
  reportReview,
  getAllReports,
  removeReview,
  dismissReport,
};