

import httpStatus from 'http-status';
import { Admin } from './admin.model';
import AppError from '../../../error/AppError';
import User from '../../user/user.model';
import { Event } from '../../event/event.model';
import { Order } from '../../userOrder/userOrder.model';
import { Ticket } from '../../Ticke/ticke.model';

const updateAdminProfile = async (id: string, payload: Record<string, any>) => {
  const allowedFields = ['fullName', 'phoneNumber', 'image'];
  const updateData: Record<string, any> = {};

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updateData[field] = payload[field];
    }
  });
  const admin = await Admin.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!admin) throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');

  return admin;
};

const changePassword = async (
  id: string,
  oldPassword: string,
  newPassword: string,
) => {
  const admin = await Admin.findById(id).select('+password');
  if (!admin) throw new AppError(404, 'Admin not found');

  const isMatch = await admin.isPasswordMatched(oldPassword);
  if (!isMatch) throw new AppError(401, 'Old password incorrect');

  admin.password = newPassword;
  await admin.save();
};

const setForgotOtp = async (email: string) => {
  const admin = await Admin.findOne({ email });
  if (!admin) throw new AppError(404, 'Admin not found');

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  admin.verification = { otp, expiresAt, verified: false };
  await admin.save();

  return otp;
};

const verifyOtp = async (email: string, otp: number) => {
  const admin = await Admin.findOne({ email });
  if (!admin || !admin.verification)
    throw new AppError(404, 'OTP not generated');

  if (admin.verification.verified)
    throw new AppError(400, 'OTP already verified');

  if (Date.now() > new Date(admin.verification.expiresAt).getTime()) {
    throw new AppError(400, 'OTP expired');
  }

  if (admin.verification.otp !== otp) throw new AppError(400, 'Invalid OTP');

  admin.verification.verified = true;
  await admin.save();
};

const resetPassword = async (email: string, newPassword: string) => {
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !admin.verification?.verified) {
    throw new AppError(400, 'OTP not verified');
  }

  admin.password = newPassword;
  admin.verification = undefined;
  await admin.save();
};



//admin dasbord api 


// ── Admin Dashboard ────────────────────────────────────────────────────────────
const getAdminDashboard = async (
  year?: number,
  analyticsType: string = "tickets",
  page: number = 1,
  limit: number = 10
) => {
  const targetYear = year || new Date().getFullYear();
  const skip = (page - 1) * limit;
 
  // ── Active Users count ────────────────────────────────────
  const activeUsers = await User.countDocuments({
    isDeleted: false,
    isActive: true,
  });
 
  // ── Ongoing Events count ──────────────────────────────────
  const ongoingEvents = await Event.countDocuments({
    isPast: false,
    isDeleted: false,
  });
 
  // ── Total Earning (tickets + orders) ─────────────────────
  const ticketEarning = await Ticket.aggregate([
    { $match: { paymentStatus: "paid", isDeleted: false } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
 
  const orderEarning = await Order.aggregate([
    { $match: { paymentStatus: "paid", isDeleted: false } },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);
 
  const totalEarning =
    (ticketEarning[0]?.total || 0) + (orderEarning[0]?.total || 0);
 
  // ── Platform Analytics (monthly) ──────────────────────────
  // analyticsType: "tickets" or "orders"
  let monthlyAnalytics;
 
  if (analyticsType === "tickets") {
    const raw = await Ticket.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          isDeleted: false,
          createdAt: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: "$quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
 
    monthlyAnalytics = Array.from({ length: 30 }, (_, i) => {
      const found = raw.find((r) => r._id === i + 1);
      return { day: i + 1, count: found?.count || 0 };
    });
  } else {
    const raw = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          isDeleted: false,
          createdAt: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
 
    monthlyAnalytics = Array.from({ length: 30 }, (_, i) => {
      const found = raw.find((r) => r._id === i + 1);
      return { day: i + 1, count: found?.count || 0 };
    });
  }
 
  // ── Event List (latest) ───────────────────────────────────
  const eventList = await Event.find({ isDeleted: false })
    .populate("host", "fullName image")
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .limit(4)
    .select("title date coverImage location");
 
  // ── New Users (latest with pagination) ───────────────────
  const totalUsers = await User.countDocuments({ isDeleted: false });
 
  const newUsers = await User.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("fullName image email role isActive isVerified createdAt");
 
  return {
    stats: {
      activeUsers,
      ongoingEvents,
      totalEarning,
    },
    analytics: {
      type: analyticsType,
      year: targetYear,
      data: monthlyAnalytics,
    },
    eventList,
    newUsers: {
      users: newUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      },
    },
  };
};




// ── Get All Users (Admin) ─────────────────────────────────────────────────────
const getAllUsers = async (
  search?: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;
 
  const filter: any = { isDeleted: false, role: "USER" };
 
  if (search && search.trim() !== "") {
    filter.$or = [
      { fullName: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
    ];
  }
 
  const total = await User.countDocuments(filter);
 
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("fullName email image role isActive isVerified createdAt");
 
  return {
    users,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};
 
// ── Block User ────────────────────────────────────────────────────────────────
const blockUser = async (userId: string) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive: false } },
    { new: true }
  ).select("fullName email isActive");
 
  if (!user) throw new Error("User not found");
  return user;
};
 
// ── Unblock User ──────────────────────────────────────────────────────────────
const unblockUser = async (userId: string) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive: true } },
    { new: true }
  ).select("fullName email isActive");
 
  if (!user) throw new Error("User not found");
  return user;
};
 
// ── Delete User ───────────────────────────────────────────────────────────────
const deleteUser = async (userId: string) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isDeleted: true } },
    { new: true }
  );
 
  if (!user) throw new Error("User not found");
  return { message: "User deleted successfully" };
};
 
// ── Get Single User ───────────────────────────────────────────────────────────
const getSingleUser = async (userId: string) => {
  const user = await User.findById(userId).select(
    "fullName email image coverImage role isActive isVerified country phoneNumber createdAt"
  );
  if (!user) throw new Error("User not found");
  return user;
};






export const adminService = {
  updateAdminProfile,
  changePassword,
  setForgotOtp,
  verifyOtp,
  resetPassword,
  getAdminDashboard,
  getAllUsers,
  blockUser,
  unblockUser,
  deleteUser,
  getSingleUser,
};
