import AppError from "../../error/AppError";
import httpStatus from 'http-status';
import User from "../user/user.model";
import SocialLink from "./soscial.model";
import { createToken } from "../auth/auth.utils";
import config from "../../config";

const register = async (payload: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  country?: string;
  phoneNumber?: string;
  howDidYouHear?: string;
  subscribeToEmails?: boolean;
  termsAccepted: boolean;

  shopName?: string;
  shopLink?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}) => {
  const {
    fullName,
    email,
    password,
    confirmPassword,
    role,
    country,
    phoneNumber,
    howDidYouHear,
    subscribeToEmails,
    termsAccepted,

    shopName,
    shopLink,
    facebook,
    instagram,
    linkedin,
    twitter,
    youtube,
    tiktok,
    website,
  } = payload;

  // ── Validations ─────────────────────────────────
  if (!termsAccepted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You must accept the Terms and Conditions.',
    );
  }

  if (password !== confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Passwords do not match.',
    );
  }

  if (password.length < 6) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Password must be at least 6 characters long.',
    );
  }

  // ── Duplicate check ─────────────────────────────
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      'An account with this email already exists.',
    );
  }

  if (phoneNumber) {
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      throw new AppError(
        httpStatus.CONFLICT,
        'An account with this phone number already exists.',
      );
    }
  }

  // ── PART 1: Create User ─────────────────────────
  const user = await User.create({
    fullName,
    email,
    password,
    role,
    country: country || undefined,
    phoneNumber: phoneNumber || undefined,
    howDidYouHear: howDidYouHear || '',
    subscribeToEmails: subscribeToEmails ?? false,
    termsAccepted,
    accountType: 'emailvarifi',
    isVerified: false,
    isActive: true,
    needsPasswordChange: false,
  });

  // ── PART 2: Create SocialLink (if provided) ─────
  const hasSocialData =
    shopName || shopLink || facebook || instagram ||
    linkedin || twitter || youtube || tiktok || website;

  if (hasSocialData) {
    await SocialLink.create({
      user: user._id,
      shopName: shopName || '',
      shopLink: shopLink || '',
      facebook: facebook || '',
      instagram: instagram || '',
      linkedin: linkedin || '',
      twitter: twitter || '',
      youtube: youtube || '',
      tiktok: tiktok || '',
      website: website || '',
    });
  }

  // ── Generate Token ──────────────────────────────
  const jwtPayload = {
    userId: user?._id.toString(),
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string,
  );

  return {
    accessToken,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
};

export const authServices = {
  register,

};