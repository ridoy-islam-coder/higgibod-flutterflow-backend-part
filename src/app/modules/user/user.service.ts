import AppError from "../../error/AppError";
import  httpStatus  from 'http-status';
import User from "./user.model";
import { TUser } from "./user.interface";
import bcrypt from "bcrypt";
import QueryBuilder from "../../builder/QueryBuilder";
import { subMonths, startOfMonth } from 'date-fns';
import { Review } from "../profilereview/profilereview.model";
import { Follow } from "../Follow/follow.model";
import { Event } from "../event/event.model";
import { Product } from "../product/product.model";
import SocialLink from "../sociallink/soscial.model";




const getme = async (id: string) => {
  const result = await User.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return {
    email: result.email,
    fullName: result.fullName,
    country: result.country,
    phoneNumber: result.phoneNumber,
    howDidYouHear: result.howDidYouHear,
    categore: result.categore,
    image: result.image ?? {},
  };
};

//update user profile

const updateProfile = async (id: string, payload: Partial<TUser>) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const restrictedFields = [ 'role', 'email'];
  restrictedFields.forEach((field) => {
    if (field in payload) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `${field} is not allowed to update`,
      );
    }
  });

  // Allow updating image, fullName, gender
  const updatedUser = await User.findByIdAndUpdate(id, payload, {
    new: true,
  });

  return updatedUser;
};

const getAllUsers = async (query: Record<string, any>) => {
  const usersQuery = new QueryBuilder(
    User.find({ isDeleted: { $ne: true } }),
    query,
  )
    .search(['fullName', 'email', 'phoneNumber']) // searchable fields
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await usersQuery.modelQuery;
  const meta = await usersQuery.countTotal();

  return { data, meta };
};

const getSingleUser = async (id: string) => {
  const result = await User.findById(id);

  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return result;
};

const deleteAccount = async (id: string, password: string) => {
  const user = await User.IsUserExistbyId(id);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.NOT_ACCEPTABLE, 'Password does not match!');
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true } },
    { new: true },
  );

  return result;
};

const updatePhoneNumber = async (id: string, payload: Partial<TUser>) => {
  const allowedPayload = {
    phoneNumber: payload.phoneNumber,
    countryCode: payload.countryCode,
  };

  const result = await User.findByIdAndUpdate(id, allowedPayload, {
    new: true,
  });

  return result;
};
//Get total users count excluding soft-deleted users
const getTotalUsersCount = async () => {
  const count = await User.countDocuments({ isDeleted: { $ne: true } });
  return count;
};
//Get monthly user starts
const getMonthlyUserStats = async () => {
  const startOfCurrentMonth = new Date();
  startOfCurrentMonth.setDate(1);
  startOfCurrentMonth.setHours(0, 0, 0, 0);

  const startOfPreviousMonth = new Date(startOfCurrentMonth);
  startOfPreviousMonth.setMonth(startOfPreviousMonth.getMonth() - 1);

  const endOfPreviousMonth = new Date(startOfCurrentMonth);

  const currentMonthUsers = await User.countDocuments({
    isDeleted: { $ne: true },
    createdAt: { $gte: startOfCurrentMonth },
  });

  const previousMonthUsers = await User.countDocuments({
    isDeleted: { $ne: true },
    createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
  });

  const difference = currentMonthUsers - previousMonthUsers;
  const percentageChange =
    previousMonthUsers > 0
      ? (difference / previousMonthUsers) * 100
      : currentMonthUsers > 0
        ? 100
        : 0;

  return {
    currentCount: currentMonthUsers,
    previousCount: previousMonthUsers,
    percentageChange: parseFloat(percentageChange.toFixed(2)),
    trend: percentageChange >= 0 ? 'up' : 'down',
  };
};
const getUsersLast12Months = async (year?: number) => {
  const now = new Date();
  const baseDate = year ? new Date(year, 11, 31) : now;
  const start = startOfMonth(subMonths(baseDate, 11));

  const users = await User.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        createdAt: { $gte: start, $lte: baseDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: 1 },
      },
    },
    {
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
      },
    },
  ]);

  const data: { month: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = subMonths(baseDate, i);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();

    const found = users.find(
      (u) => u._id.year === year && u._id.month === date.getMonth() + 1,
    );

    data.push({ month, total: found?.total || 0 });
  }

  return data;
};

const getUserGrowthPercentage = async (year?: number) => {
  const users = await getUsersLast12Months(year);
  const first = users[0]?.total || 0;
  const last = users[11]?.total || 0;

  const difference = last - first;
  const percentageChange =
    first > 0 ? (difference / first) * 100 : last > 0 ? 100 : 0;

  return {
    users,
    growthPercentage: parseFloat(percentageChange.toFixed(2)),
    trend: percentageChange >= 0 ? 'up' : 'down',
  };
};
const blockUser = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role === 'admin' || user.role === 'USER' || user.role === 'ORGANIZER') {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot block an admin');
  }
  if (!user.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is already blocked');
  }
  user.isActive = false;
  await user.save();

  return user;
};

const unblockUser = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is already active');
  }

  user.isActive = true;
  await user.save();

  return user;
};











// ── Get Users by Role ─────────────────────────────────────────────────────────
// Default: সব ORGANIZER আসবে
// ?role=MARCHANT → MARCHANT রা আসবে
// ?role=KAATEDJ → KAATEDJ রা আসবে

// ── Get Users by Role with Search + Followers + Rating ────────────────────────
const getUsersByRole = async (
  role: string = "ORGANIZER",
  search?: string,
  page: number = 1,
  limit: number = 10,
  currentUserId?: string
) => {
  const skip = (page - 1) * limit;
 
  const filter: any = {
    role,
    isDeleted: false,
    isActive: true,
  };
 
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
    .select(
      "fullName email image coverImage country phoneNumber role accountType isVerified createdAt"
    );
 
  const usersWithStats = await Promise.all(
    users.map(async (user: any) => {
      // ── Followers count ───────────────────────────────────
      const followersCount = await Follow.countDocuments({
        following: user._id,
      });
 
      // ── Average rating ────────────────────────────────────
      const ratingResult = await Review.aggregate([
        {
          $match: {
            organizer: user._id,
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      const avgRating = ratingResult[0]?.avgRating
        ? parseFloat(ratingResult[0].avgRating.toFixed(1))
        : 0;
      const totalReviews = ratingResult[0]?.totalReviews || 0;
 
      // ── Current user এই profile follow করেছে কিনা ─────────
      const isFollowing = currentUserId
        ? !!(await Follow.findOne({
            follower: currentUserId,
            following: user._id,
          }))
        : false;
 
      // ── Current user এই profile review করেছে কিনা ─────────
      const hasReviewed = currentUserId
        ? !!(await Review.findOne({
            organizer: user._id,
            reviewer: currentUserId,
            isDeleted: { $ne: true },
          }))
        : false;
 
      return {
        ...user.toObject(),
        followersCount,
        avgRating,
        totalReviews,
        isFollowing,  // ← follow করেছে কিনা
        hasReviewed,  // ← review করেছে কিনা
      };
    })
  );


  return {
    users: usersWithStats,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};




 
const getOrganizerProfile = async (
  organizerId: string,
  currentUserId?: string
) => {
  // ── User data ─────────────────────────────────────────────
  const user = await User.findById(organizerId).select(
    "fullName email image coverImage country phoneNumber role bio socialLinks isVerified createdAt"
  );
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
 
  // ── Event count ───────────────────────────────────────────
  const eventCount = await Event.countDocuments({
    host: organizerId,
    isDeleted: false,
  });
 
  // ── Following count (কতজনকে follow করে) ──────────────────
  const followingCount = await Follow.countDocuments({
    follower: organizerId,
  });
 
  // ── Followers count (কতজন follow করে) ────────────────────
  const followersCount = await Follow.countDocuments({
    following: organizerId,
  });
 
  // ── Review count & avg rating ─────────────────────────────
  const ratingResult = await Review.aggregate([
    {
      $match: {
        organizer: user._id,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
 
  const avgRating = ratingResult[0]?.avgRating
    ? parseFloat(ratingResult[0].avgRating.toFixed(1))
    : 0;
  const totalReviews = ratingResult[0]?.totalReviews || 0;
 
  // ── isFollowing (current user follow করেছে কিনা) ──────────
  const isFollowing = currentUserId
    ? !!(await Follow.findOne({
        follower: currentUserId,
        following: organizerId,
      }))
    : false;
 
  // ── Upcoming Events (latest 5) ────────────────────────────
  const upcomingEvents = await Event.find({
    host: organizerId,
    isPast: false,
    isDeleted: false,
    date: { $gte: new Date() },
  })
    .populate("category", "name")
    .sort({ date: 1 })
    .limit(5)
    .select("title date time location coverImage price isFeatured eventType");
 
  // ── Reviews (latest 3) ────────────────────────────────────
  const reviews = await Review.find({
    organizer: organizerId,
    isDeleted: false,
  })
    .populate("reviewer", "fullName image isAnonymous")
    .sort({ createdAt: -1 })
    .limit(3)
    .select("rating comment createdAt isAnonymous reply reviewer");
 
  return {
    user: {
      ...user.toObject(),
      eventCount,       // 14 Event
      followingCount,   // 89 Following
      followersCount,   // Followers
      totalReviews,     // 123 Review
      avgRating,        // ⭐ rating
      isFollowing,      // Follow button
    },
    upcomingEvents,
    reviews,
  };
};






const getMarchantProfile = async (
  marchantId: string,
  currentUserId?: string
) => {
  const user = await User.findById(marchantId).select(
    "fullName email image coverImage country phoneNumber role bio isVerified createdAt"
  );
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
 
  // ── Social Links ──────────────────────────────────────────
  const socialLinks = await SocialLink.findOne({ user: marchantId }).select(
    "shopName shopLink facebook instagram linkedin twitter youtube tiktok website"
  );
 
  // ── Product count ─────────────────────────────────────────
  const productCount = await Product.countDocuments({
    host: marchantId,
    isDeleted: false,
  });
 
  // ── Following count ───────────────────────────────────────
  const followingCount = await Follow.countDocuments({ follower: marchantId });
 
  // ── Followers count ───────────────────────────────────────
  const followersCount = await Follow.countDocuments({ following: marchantId });
 
  // ── Review count & avg rating ─────────────────────────────
  const ratingResult = await Review.aggregate([
    { $match: { organizer: user._id, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
 
  const avgRating = ratingResult[0]?.avgRating
    ? parseFloat(ratingResult[0].avgRating.toFixed(1))
    : 0;
  const totalReviews = ratingResult[0]?.totalReviews || 0;
 
  // ── isFollowing ───────────────────────────────────────────
  const isFollowing = currentUserId
    ? !!(await Follow.findOne({ follower: currentUserId, following: marchantId }))
    : false;
 
  // ── Products ──────────────────────────────────────────────
  const products = await Product.find({
    host: marchantId,
    isDeleted: false,
  })
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .limit(10)
    .select("name price images category colors sizes discount stock");
 
  // ── Reviews ───────────────────────────────────────────────
  const reviews = await Review.find({
    organizer: marchantId,
    isDeleted: false,
  })
    .populate("reviewer", "fullName image")
    .sort({ createdAt: -1 })
    .limit(3)
    .select("rating comment createdAt isAnonymous reply reviewer");
 
  return {
    user: {
      ...user.toObject(),
      productCount,
      followingCount,
      followersCount,
      totalReviews,
      avgRating,
      isFollowing,
      socialLinks: socialLinks || null,  // ← social links
    },
    products,
    reviews,
  };
};




export const userServices = {
  getme,
  updateProfile,
  getSingleUser,
  deleteAccount,
  getUsersByRole,
  getOrganizerProfile,
  updatePhoneNumber,
  getAllUsers,
  getTotalUsersCount,
  getMonthlyUserStats,
  getUsersLast12Months,
  getUserGrowthPercentage,
  blockUser,
  unblockUser,
  getMarchantProfile,
};
