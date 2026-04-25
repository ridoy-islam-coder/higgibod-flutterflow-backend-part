import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { followServices } from './followprofile.service';
import sendResponse from '../../utils/sendResponse';


const followOrganizer = catchAsync(async (req: Request, res: Response) => {
  const result = await followServices.followOrganizer(req.user._id, req.params.organizerId as string);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Followed successfully', data: result });
});

const unfollowOrganizer = catchAsync(async (req: Request, res: Response) => {
  const result = await followServices.unfollowOrganizer(req.user._id, req.params.organizerId as string);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Unfollowed successfully', data: result });
});

const getMyFollowing = catchAsync(async (req: Request, res: Response) => {
  const result = await followServices.getMyFollowing(
    req.user._id,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Following list fetched successfully', data: result });
});

const getOrganizerFollowers = catchAsync(async (req: Request, res: Response) => {
  const result = await followServices.getOrganizerFollowers(
    req.params.organizerId as string,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Followers fetched successfully', data: result });
});

const checkFollowStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await followServices.checkFollowStatus(req.user._id, req.params.organizerId as string);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Follow status fetched successfully', data: result });
});

export const followController = {
  followOrganizer,
  unfollowOrganizer,
  getMyFollowing,
  getOrganizerFollowers,
  checkFollowStatus,
};