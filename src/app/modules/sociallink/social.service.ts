import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import User from '../user/user.model';
import SocialLink from './soscial.model';
import { createToken } from '../auth/auth.utils';
import config from '../../config';
import {
  deleteFromS3,
  deleteManyFromS3,
  uploadToS3,
} from '../../utils/fileHelper';
import mongoose from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';
import { Personalization } from '../Personalizationuser/Personalization.model';
import { generateOtp } from '../../utils/otpGenerator';
import moment from 'moment';
import { sendEmail } from '../../utils/mailSender';

// const register = async (payload: {
//   fullName: string;
//   email: string;
//   password: string;
//   confirmPassword: string;
//   role: string;
//   country?: string;
//   phoneNumber?: string;
//   howDidYouHear?: string;
//   subscribeToEmails?: boolean;
//   termsAccepted: boolean;

//   shopName?: string;
//   shopLink?: string;
//   facebook?: string;
//   instagram?: string;
//   linkedin?: string;
//   twitter?: string;
//   youtube?: string;
//   tiktok?: string;
//   website?: string;
// }) => {
//   const {
//     fullName,
//     email,
//     password,
//     confirmPassword,
//     role,
//     country,
//     phoneNumber,
//     howDidYouHear,
//     subscribeToEmails,
//     termsAccepted,

//     shopName,
//     shopLink,
//     facebook,
//     instagram,
//     linkedin,
//     twitter,
//     youtube,
//     tiktok,
//     website,
//   } = payload;

//   // ── Validations ─────────────────────────────────
//   if (!termsAccepted) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'You must accept the Terms and Conditions.',
//     );
//   }

//   if (password !== confirmPassword) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'Passwords do not match.',
//     );
//   }

//   if (password.length < 6) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'Password must be at least 6 characters long.',
//     );
//   }

//   // ── Duplicate check ─────────────────────────────
//   const existingEmail = await User.findOne({ email });
//   if (existingEmail) {
//     throw new AppError(
//       httpStatus.CONFLICT,
//       'An account with this email already exists.',
//     );
//   }

//   if (phoneNumber) {
//     const existingPhone = await User.findOne({ phoneNumber });
//     if (existingPhone) {
//       throw new AppError(
//         httpStatus.CONFLICT,
//         'An account with this phone number already exists.',
//       );
//     }
//   }

//   // ── PART 1: Create User ─────────────────────────
//   const user = await User.create({
//     fullName,
//     email,
//     password,
//     role,
//     country: country || undefined,
//     phoneNumber: phoneNumber || undefined,
//     howDidYouHear: howDidYouHear || '',
//     subscribeToEmails: subscribeToEmails ?? false,
//     termsAccepted,
//     accountType: 'emailvarifi',
//     isVerified: false,
//     isActive: true,
//     needsPasswordChange: false,
//   });

//   console.log("🚀 ~ file: social.controller.ts:122 ~ register ~ user:", user)
//   // ── PART 2: Create SocialLink (if provided) ─────
//   const hasSocialData =
//     shopName || shopLink || facebook || instagram ||
//     linkedin || twitter || youtube || tiktok || website;

//   if (hasSocialData) {
//     await SocialLink.create({
//       user: user._id,
//       shopName: shopName || '',
//       shopLink: shopLink || '',
//       facebook: facebook || '',
//       instagram: instagram || '',
//       linkedin: linkedin || '',
//       twitter: twitter || '',
//       youtube: youtube || '',
//       tiktok: tiktok || '',
//       website: website || '',
//     });
//   }

//   console.log("🚀 ~ file: social.controller.ts:149 ~ register ~ user._id:", hasSocialData)

//   // ── Generate Token ──────────────────────────────
//   const jwtPayload = {
//     userId: user?._id.toString(),
//     role: user?.role,
//   };

//   const accessToken = createToken(
//     jwtPayload,
//     config.jwt.jwt_access_secret as string,
//     config.jwt.jwt_access_expires_in as string,
//   );

//   return {
//     accessToken,
//     user: {
//       _id: user._id,
//       fullName: user.fullName,
//       email: user.email,
//       role: user.role,
//       isVerified: user.isVerified,
//     },
//   };
// };

const updateProfile = async (
  user: JwtPayload,
  body: Record<string, unknown>,
  files: Record<string, Express.Multer.File[]> | undefined,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userUpdateData: Record<string, unknown> = {};

    const userFields = [
      'fullName',
      'phoneNumber',
      'country',
      'djname',
      'about',
      'language',
      'howDidYouHear',
      'subscribeToEmails',
    ];
    for (const field of userFields) {
      if (body[field] !== undefined) {
        userUpdateData[field] = body[field];
      }
    }

    // ─── Profile Image ───────────────────────────────────────
    if (files?.profileImage?.[0]) {
      const existingUser = await User.findById(user.id);

      if (existingUser?.image?.id) {
        await deleteFromS3(String(existingUser.image.id)); // ✅ single string
      }

      const uploaded = await uploadToS3(
        files.profileImage[0],
        'profile-images',
      );
      userUpdateData['image'] = {
        id: uploaded.id,
        url: uploaded.url,
      };
    }

    // ─── Cover Image ─────────────────────────────────────────
    if (files?.coverImage?.[0]) {
      const existingUser = await User.findById(user.id);

      if (existingUser?.coverImage?.id) {
        await deleteFromS3(String(existingUser.coverImage.id)); // ✅ single string
      }

      const uploaded = await uploadToS3(files.coverImage[0], 'cover-images');
      userUpdateData['coverImage'] = {
        id: uploaded.id,
        url: uploaded.url,
      };
    }

    // ─── Update User ─────────────────────────────────────────
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: userUpdateData },
      { new: true, session },
    );

    if (!updatedUser) throw new Error('User not found');

    // ─── Social Link fields ──────────────────────────────────
    const socialFields = [
      'shopName',
      'shopLink',
      'facebook',
      'instagram',
      'linkedin',
      'twitter',
      'youtube',
      'tiktok',
      'website',
    ];
    const socialUpdateData: Record<string, unknown> = {};

    for (const field of socialFields) {
      if (body[field] !== undefined) {
        socialUpdateData[field] = body[field];
      }
    }

    let updatedSocial = null;
    if (Object.keys(socialUpdateData).length > 0) {
      updatedSocial = await SocialLink.findOneAndUpdate(
        { user: user.id },
        { $set: socialUpdateData },
        { new: true, upsert: true, session },
      );
    }

    await session.commitTransaction();
    return { user: updatedUser, socialLinks: updatedSocial };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getProfile = async (user: JwtPayload) => {
  const result = await User.findById(user.id).select('+coverImage').populate({
    path: 'subscription.plan',
    select: 'name price duration features ',
  });

  if (!result) throw new Error('User not found');

  // Social links also fetch koro
  const socialLinks = await SocialLink.findOne({ user: user.id });
  const Personalizationdata = await Personalization.findOne({ user: user.id });

  return { user: result, socialLinks, Personalizationdata };
};

// export const register = async (payload: any) => {
//   const {
//     fullName,
//     email,
//     about,
//     password,
//     confirmPassword,
//     role,
//     country,
//     phoneNumber,
//     howDidYouHear,
//     subscribeToEmails,
//     termsAccepted,
//     longitude,
//     latitude,
//     djname,
//     // 🔥 social fields
//     shopName,
//     shoptype,
//     facebook,
//     instagram,
//     linkedin,
//     twitter,
//     youtube,
//     tiktok,
//     website,
//     shoplink,
//     file, // 👈 image
//   } = payload;

//   // // ✅ Validations
//   // if (!termsAccepted) {
//   //   throw new AppError(httpStatus.BAD_REQUEST, 'Accept terms first');
//   // }

//   if (password !== confirmPassword) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Password not match');
//   }

//   if (password.length < 6) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Password too short');
//   }

//   // ✅ Duplicate check
//   const existingUser = await User.findOne({ email });
//   if (existingUser) {
//     throw new AppError(httpStatus.CONFLICT, 'Email already exists');
//   }

//   if (phoneNumber) {
//     const existingPhone = await User.findOne({ phoneNumber });
//     if (existingPhone) {
//       throw new AppError(httpStatus.CONFLICT, 'Phone already exists');
//     }
//   }

//   // ✅ Upload Image
//   let uploadedImage;
//   if (file) {
//     uploadedImage = await uploadToS3(file, 'user');
//   }

//  // ✅ Geo location build
//   let geoLocation;

//   if (longitude && latitude) {
//     geoLocation = {
//       type: "Point",
//       coordinates: [
//         parseFloat(longitude),
//         parseFloat(latitude),
//       ],
//     };
//   }

//   // ✅ Create User
//   const user = await User.create({
//     fullName,
//     email,
//     password,
//     djname: djname || '',
//     role,
//     about: about || '',
//     image: uploadedImage
//       ? {
//           id: uploadedImage.id,
//           url: uploadedImage.url,
//         }
//       : undefined,
//     location: geoLocation,
//     country: country || undefined,
//     phoneNumber: phoneNumber || undefined,
//     howDidYouHear: howDidYouHear || '',
//     subscribeToEmails: subscribeToEmails ?? false,
//     termsAccepted,
//     accountType: 'emailvarifi',
//     isVerified: false,
//     isActive: true,
//     needsPasswordChange: false,
//   });

//   // ✅ Create Social Links (if any data exists)
//   const hasSocialData =
//     shopName || shoptype || facebook || instagram ||
//     linkedin || twitter || youtube || tiktok || website || shoplink;

//   if (hasSocialData) {
//     await SocialLink.create({
//       user: user._id,
//       shopName: shopName || '',
//       shoptype: shoptype || '',
//       facebook: facebook || '',
//       instagram: instagram || '',
//       linkedin: linkedin || '',
//       twitter: twitter || '',
//       youtube: youtube || '',
//       tiktok: tiktok || '',
//       website: website || '',
//       shoplink: shoplink || '',
//     });
//   }

//   // ── Generate Token ──────────────────────────────
//   const jwtPayload = {
//     userId: user?._id.toString(),
//     role: user?.role,
//   };

//   const accessToken = createToken(
//     jwtPayload,
//     config.jwt.jwt_access_secret as string,
//     config.jwt.jwt_access_expires_in as string,
//   );

//   return {
//     user: {
//       _id: user._id,
//       fullName: user.fullName,
//       email: user.email,
//       role: user.role,
//       image: user.image,
//       isVerified: user.isVerified,
//     },
//     accessToken
//   };
// };

export const register = async (payload: any) => {
  const {
    fullName,
    email,
    about,
    password,
    confirmPassword,
    role,
    country,
    phoneNumber,
    howDidYouHear,
    subscribeToEmails,
    termsAccepted,
    longitude,
    latitude,
    djname,
    shopName,
    shoptype,
    facebook,
    instagram,
    linkedin,
    twitter,
    youtube,
    tiktok,
    website,
    shoplink,
    file,
  } = payload;

  if (password !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password not match');
  }

  if (password.length < 6) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password too short');
  }

  // ✅ Existing user check
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    // ✅ Already verified — block করো
    if (existingUser.isVerified) {
      throw new AppError(httpStatus.CONFLICT, 'Email already exists');
    }

    // ✅ Not verified — নতুন OTP পাঠাও
    const otp = generateOtp();
    const expiresAt = moment().add(10, 'minute').toDate();

    await User.findByIdAndUpdate(existingUser._id, {
      verification: {
        otp,
        expiresAt,
        status: false,
      },
    });

    await sendEmail(
      email,
      'Verify your account',
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
          <h2>Welcome!</h2>
          <p>Your email verification code is:</p>
          <h1 style="letter-spacing: 8px; color: #F5A623;">${otp}</h1>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
        </div>
      `,
    );

    return { email };
  }

  // ✅ Phone check
  if (phoneNumber) {
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      throw new AppError(httpStatus.CONFLICT, 'Phone already exists');
    }
  }

  // ✅ Image upload
  let uploadedImage;
  if (file) {
    uploadedImage = await uploadToS3(file, 'user');
  }

  // ✅ Geo location
  let geoLocation;
  if (longitude && latitude) {
    geoLocation = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
  }

  // ✅ OTP generate
  const otp = generateOtp();
  const expiresAt = moment().add(10, 'minute').toDate();

  // ✅ User create
  const user = await User.create({
    fullName,
    email,
    password,
    djname: djname || '',
    role,
    about: about || '',
    image: uploadedImage
      ? { id: uploadedImage.id, url: uploadedImage.url }
      : undefined,
    location: geoLocation,
    country: country || undefined,
    phoneNumber: phoneNumber || undefined,
    howDidYouHear: howDidYouHear || '',
    subscribeToEmails: subscribeToEmails ?? false,
    termsAccepted,
    accountType: 'emailvarifi',
    isVerified: false,
    isActive: true,
    needsPasswordChange: false,
    verification: {
      otp,
      expiresAt,
      status: false,
    },
  });

  // ✅ Social Links
  const hasSocialData =
    shopName ||
    shoptype ||
    facebook ||
    instagram ||
    linkedin ||
    twitter ||
    youtube ||
    tiktok ||
    website ||
    shoplink;

  if (hasSocialData) {
    await SocialLink.create({
      user: user._id,
      shopName: shopName || '',
      shoptype: shoptype || '',
      facebook: facebook || '',
      instagram: instagram || '',
      linkedin: linkedin || '',
      twitter: twitter || '',
      youtube: youtube || '',
      tiktok: tiktok || '',
      website: website || '',
      shoplink: shoplink || '',
    });
  }

  // ✅ OTP email
  await sendEmail(
    email,
    'Verify your account',
    `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Welcome!</h2>
        <p>Your email verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #F5A623;">${otp}</h1>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
      </div>
    `,
  );

  return { email };
};

export const verifyEmailregister = async (email: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email already verified');
  }

  // ✅ OTP check
  if (String(user.verification?.otp) !== String(otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  // ✅ Expiry check
  if (moment().isAfter(moment(user.verification?.expiresAt))) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP has expired');
  }

  // ✅ Verified — verification clear করো
  await User.findByIdAndUpdate(user._id, {
    isVerified: true,
    verification: {
      otp: null,
      expiresAt: null,
      status: true,
    },
  });

  // ✅ Social Links নিয়ে নাও
  const socialLink = await SocialLink.findOne({ user: user._id });

  const jwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string,
  );

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      image: user.image,
      isVerified: true,
      socialLink: socialLink || null,
    },
    accessToken,
  };
};

export const sosalServices = {
  register,
  updateProfile,
  getProfile,
};
