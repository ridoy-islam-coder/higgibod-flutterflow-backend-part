import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { reviewServices } from './profilereview.service';


const createReview = catchAsync(async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  const result = await reviewServices.createReview(req.user._id, req.body, file);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review posted successfully',
    data: result,
  });
});

const getOrganizerReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewServices.getOrganizerReviews(
    req.params.organizerId as string,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews fetched successfully',
    data: result,
  });
});

const reportReview = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewServices.reportReview(
    req.user._id,
    req.params.reviewId  as string,
    req.body.reason,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review reported successfully',
    data: result,
  });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewServices.getAllReports(
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reports fetched successfully',
    data: result,
  });
});

const removeReview = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewServices.removeReview(req.params.reportId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review removed successfully',
    data: result,
  });
});

const dismissReport = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewServices.dismissReport(req.params.reportId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Report dismissed successfully',
    data: result,
  });
});



// ── POST /:reviewId/reply — reply দাও ────────────────────────────────────────
const replyToReview = catchAsync(async (req: Request, res: Response) => {
  const organizerId = req.user._id;
  const { reviewId } = req.params;
  const { comment } = req.body;
 
  const result = await reviewServices.replyToReview(
    organizerId,
    reviewId as string,
    comment
  );
 
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Reply added successfully',
    data: result,
  });
});
 
// ── PATCH /:reviewId/reply — reply update করো ────────────────────────────────
const updateReply = catchAsync(async (req: Request, res: Response) => {
  const organizerId = req.user._id;
  const { reviewId } = req.params;
  const { comment } = req.body;
 
  const result = await reviewServices.updateReply(
    organizerId,
    reviewId as string,
    comment
  );
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reply updated successfully',
    data: result,
  });
});
 
// ── DELETE /:reviewId/reply — reply মুছো ─────────────────────────────────────
const deleteReply = catchAsync(async (req: Request, res: Response) => {
  const organizerId = req.user._id;
  const { reviewId } = req.params;
 
  const result = await reviewServices.deleteReply(organizerId, reviewId as string);
 
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reply deleted successfully',
    data: result,
  });
});


export const reviewController = {
  createReview,
  getOrganizerReviews,
  reportReview,
  getAllReports,
  removeReview,
  dismissReport,
  replyToReview,
  updateReply,
  deleteReply,
};