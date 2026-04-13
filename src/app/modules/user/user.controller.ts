import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { userServices } from "./user.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from 'http-status';
import { uploadToS3 } from "../../utils/fileHelper";

// Get current user's profile
const getme = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.getme(req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User retrieved successfully',
    data: result,
  });
});

// Update user phone number (only phoneNumber & countryCode allowed)
const updatePhoneNumber = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.updatePhoneNumber(req.user.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Phone number updated successfully',
    data: result,
  });
});





const updateProfile = catchAsync(async (req: Request, res: Response) => {
  let image;

  // Upload image if provided
  if (req.file) {
    image = await uploadToS3(req.file, 'profile/');
  }

  // Check role
  const isAdmin = req.user.role === 'agencies' || req.user.role === 'influencer';

  // User can update own profile, admin can update others
  const userIdToUpdate =
    isAdmin && req.params.id ? req.params.id : req.user.id;

  // Admin updating own profile
  const isAdminUpdatingSelf =
    isAdmin && userIdToUpdate.toString() === req.user.id.toString();

  // Build update data
  const updateData: Record<string, any> = {
    ...req.body,
    ...(image && { image }),
  };

  // Make gender optional if admin updates own profile
  if (isAdminUpdatingSelf && !req.body.gender) {
    delete updateData.gender;
  }

    // Remove forbidden fields
  const forbiddenFields = ['role', 'isVerified']; // phoneNumber allowed now
  for (const key of forbiddenFields) delete updateData[key];

  // Optional: remove gender if missing
  // if (!req.body.gender) delete updateData.gender;


  // Update profile
  const result = await userServices.updateProfile(
    userIdToUpdate,
    updateData,
  );





  // (Optional) Save notification ONLY (no socket)
  // await saveNotification({
  //   userId: userIdToUpdate.toString(),
  //   title: 'Profile Updated',
  //   userType: 'User',
  //   message: 'Your profile has been updated successfully.',
  //   type: 'profile',
  // });

  // Response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});


// Get single user (used by admin)
const getsingleUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.getSingleUser(req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User retrieved successfully',
    data: result,
  });
});

// Get all users (used by admin)
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

// Delete own account (soft delete)
const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.deleteAccount(
    req.user.id,
    req.body.password,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User account deleted successfully',
    data: result,
  });
});
//total users count by admin
const getTotalUsersCount = catchAsync(async (_req: Request, res: Response) => {
  const count = await userServices.getTotalUsersCount();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Total users count fetched successfully',
    data: count,
  });
});
//monthly user starts by admin
const getMonthlyUserStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await userServices.getMonthlyUserStats();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Monthly user stats fetched successfully',
    data: result,
  });
});
//Get 12-month user growth overview by admin
const getUserGrowthOverview = catchAsync(
  async (req: Request, res: Response) => {
    const year = req.query.year
      ? parseInt(req.query.year as string)
      : undefined;
    const result = await userServices.getUserGrowthPercentage(year);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: '12-month user growth fetched successfully',
      data: result,
    });
  },
);
const blockUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.blockUser(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User blocked successfully',
    data: result,
  });
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.unblockUser(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User unblocked successfully',
    data: result,
  });
});

export const userControllers = {
  getme,
  updateProfile,
  getsingleUser,
  getAllUsers,
  deleteAccount,
  updatePhoneNumber,
  getTotalUsersCount,
  getMonthlyUserStats,
  getUserGrowthOverview,
  blockUser,
  unblockUser,
};
