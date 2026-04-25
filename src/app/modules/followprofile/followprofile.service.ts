import httpStatus from 'http-status';

import User from '../user/user.model';
import AppError from '../../error/AppError';
import { Follow } from './followprofile.model';

const followOrganizer = async (followerId: string, organizerId: string) => {
  const organizer = await User.findOne({
    _id: organizerId,
    role: 'organizer',
    isDeleted: { $ne: true },
  });
  if (!organizer) throw new AppError(httpStatus.NOT_FOUND, 'Organizer not found');

  if (followerId === organizerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot follow yourself');
  }

  const alreadyFollowing = await Follow.findOne({
    follower: followerId,
    organizer: organizerId,
  });
  if (alreadyFollowing) {
    throw new AppError(httpStatus.CONFLICT, 'You are already following this organizer');
  }

  const result = await Follow.create({ follower: followerId, organizer: organizerId });
  return result;
};

const unfollowOrganizer = async (followerId: string, organizerId: string) => {
  const follow = await Follow.findOneAndDelete({
    follower: followerId,
    organizer: organizerId,
  });
  if (!follow) throw new AppError(httpStatus.NOT_FOUND, 'You are not following this organizer');
  return { message: 'Unfollowed successfully' };
};

const getMyFollowing = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const total = await Follow.countDocuments({ follower: userId });

  const following = await Follow.find({ follower: userId })
    .populate('organizer', 'fullName image coverImage role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    following,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getOrganizerFollowers = async (
  organizerId: string,
  page = 1,
  limit = 10,
) => {
  const skip = (page - 1) * limit;
  const total = await Follow.countDocuments({ organizer: organizerId });

  const followers = await Follow.find({ organizer: organizerId })
    .populate('follower', 'fullName image role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    followers,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const checkFollowStatus = async (followerId: string, organizerId: string) => {
  const follow = await Follow.findOne({ follower: followerId, organizer: organizerId });
  return { isFollowing: !!follow };
};

export const followServices = {
  followOrganizer,
  unfollowOrganizer,
  getMyFollowing,
  getOrganizerFollowers,
  checkFollowStatus,
};