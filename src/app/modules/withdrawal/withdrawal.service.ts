import mongoose from 'mongoose';
import Stripe from 'stripe';
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { BalanceModel } from '../Balance/balance.model';
import { WithdrawalModel } from './withdrawal.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const MIN_WITHDRAWAL_AMOUNT = 10;

export class WithdrawalService {
  static async requestWithdrawal(userId: string, amount: number) {
    if (!amount || amount < MIN_WITHDRAWAL_AMOUNT) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}`,
      );
    }

    // Atomic operation to deduct balance safely
    const balance = await BalanceModel.findOneAndUpdate(
      {
        userId,
        currentBalance: { $gte: amount },
      },
      {
        $inc: { currentBalance: -amount },
      },
      { new: true },
    );

    if (!balance) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient balance or account not found');
    }

    const withdrawal = await WithdrawalModel.create({
      driverProfileId: balance._id,
      amount,
      status: 'PENDING',
    });

    return withdrawal;
  }

  static async getWithdrawalHistory(userId: string) {
    const balance = await BalanceModel.findOne({ userId });
    if (!balance) {
      throw new AppError(httpStatus.NOT_FOUND, 'Balance account not found');
    }

    return WithdrawalModel.find({ driverProfileId: balance._id })
      .sort({ createdAt: -1 })
      .lean();
  }

  static async getWithdrawalStatus(withdrawalId: string) {
    const withdrawal = await WithdrawalModel.findById(withdrawalId);
    if (!withdrawal) {
      throw new AppError(httpStatus.NOT_FOUND, 'Withdrawal not found');
    }
    return withdrawal;
  }

  static async rejectWithdrawal(withdrawalId: string, adminId: string) {
    const session = await mongoose.startSession();
    try {
      await session.startTransaction();

      // Atomic update to prevent race conditions (Double Processing)
      const withdrawal = await WithdrawalModel.findOneAndUpdate(
        { _id: withdrawalId, status: 'PENDING' },
        {
          $set: {
            status: 'REJECTED',
            processedBy: adminId,
            processedAt: new Date(),
          },
        },
        { session, new: true }
      );

      if (!withdrawal) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Withdrawal not found or already processed',
        );
      }

      // Return funds to driver balance
      await BalanceModel.findByIdAndUpdate(
        withdrawal.driverProfileId,
        { $inc: { currentBalance: withdrawal.amount } },
        { session }
      );

      await session.commitTransaction();
      return withdrawal;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async approveWithdrawal(withdrawalId: string, adminId: string) {
    // 1. Double processing protection using atomic update
    const withdrawal = await WithdrawalModel.findOneAndUpdate(
      { _id: withdrawalId, status: 'PENDING' },
      { $set: { status: 'COMPLETED', processedBy: adminId, processedAt: new Date() } },
      { new: true }
    );

    if (!withdrawal) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Withdrawal not found or already processed',
      );
    }

    const balance = await BalanceModel.findById(withdrawal.driverProfileId);
    if (!balance) {
      // Manual rollback if balance profile deleted somehow
      await WithdrawalModel.findByIdAndUpdate(withdrawalId, { $set: { status: 'PENDING' } });
      throw new AppError(httpStatus.NOT_FOUND, 'Balance account not found');
    }

    if (!balance.stripeAccountId || !balance.stripeOnboarded) {
      // Manual rollback
      await WithdrawalModel.findByIdAndUpdate(withdrawalId, { $set: { status: 'PENDING' } });
      throw new AppError(httpStatus.BAD_REQUEST, 'Stripe onboarding not completed');
    }

    try {
      // 2. Execute Stripe Transfer
      const transfer = await stripe.transfers.create({
        amount: Math.round(withdrawal.amount * 100), // Stripe works in cents
        currency: 'usd',
        destination: balance.stripeAccountId,
        description: `Withdrawal ${withdrawal._id}`,
      });

      // 3. Save stripe transfer ID
      withdrawal.stripeTransferId = transfer.id;
      await withdrawal.save();

      return withdrawal;
    } catch (stripeError: any) {
      // If stripe fails, rollback database status back to PENDING
      await WithdrawalModel.findByIdAndUpdate(withdrawalId, {
        $set: { status: 'PENDING', processedBy: null, processedAt: null }
      });
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Stripe Transfer Failed: ${stripeError.message}`
      );
    }
  }
}