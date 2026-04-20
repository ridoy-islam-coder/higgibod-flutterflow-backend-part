// src/app/middlewares/checkSubscription.ts

import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';

import User from '../modules/user/user.model';
import AppError from '../error/AppError';

const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

    // ─── Admin কে check করতে হবে না ─────────────────────────────
    if (user.role === 'admin') {
      return next();
    }

    const status = user.subscription?.status;
    const expiresAt = user.subscription?.expiresAt;

    // ─── Subscription নেই ────────────────────────────────────────
    if (!status || status === 'none') {
      throw new AppError(
        httpStatus.PAYMENT_REQUIRED,
        'Please subscribe to access this feature',
      );
    }

    // ─── Cancelled ────────────────────────────────────────────────
    if (status === 'cancelled') {
      throw new AppError(
        httpStatus.PAYMENT_REQUIRED,
        'Your subscription has been cancelled. Please subscribe again',
      );
    }

    // ─── Trial শেষ হয়েছে কিনা check ──────────────────────────────
    if (status === 'trialing' && expiresAt) {
      if (new Date() > expiresAt) {
        // Auto expired করো DB তে
        await User.findByIdAndUpdate(userId, {
          'subscription.status': 'expired',
        });
        throw new AppError(
          httpStatus.PAYMENT_REQUIRED,
          'Your free trial has ended. Please subscribe to continue',
        );
      }
    }

    // ─── Subscription Expired ─────────────────────────────────────
    if (status === 'expired') {
      throw new AppError(
        httpStatus.PAYMENT_REQUIRED,
        'Your subscription has expired. Please renew to continue',
      );
    }

    // ─── Active বা Trialing (valid) → next() ──────────────────────
    next();

  } catch (error) {
    next(error);
  }
};

export default checkSubscription;