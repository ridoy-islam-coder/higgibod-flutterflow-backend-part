// // src/app/middlewares/checkSubscription.ts
// import { Request, Response, NextFunction } from 'express';
// import httpStatus from 'http-status';
// import User from '../modules/user/user.model';
// import AppError from '../error/AppError';

// const PLAN_HIERARCHY: Record<string, number> = {
//   starter: 1,
//   free: 2,
//   pro: 3,
// };

// const checkSubscription = (requiredPlan: 'starter' | 'free' | 'pro') => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const userId = req.user._id;

//       // ─── SubscriptionPlan populate করো ──────────────────────
//       const user = await User.findById(userId).populate('subscription.plan');

//       if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

//       // ─── Admin bypass ────────────────────────────────────────
//       if (user.role === 'admin') return next();

//       const status = user.subscription?.status;
//       const expiresAt = user.subscription?.expiresAt;
//       const planDoc = user.subscription?.plan as any;
//       const userPlanName: string = planDoc?.name?.toLowerCase();

//       // ─── Subscription নেই ────────────────────────────────────
//       if (!status || status === 'none' || !planDoc) {
//         throw new AppError(
//           httpStatus.PAYMENT_REQUIRED,
//           'Please subscribe to access this feature',
//         );
//       }

//       // ─── Plan এর role user এর role এর সাথে match করে কিনা ───
//       if (planDoc.role && planDoc.role !== user.role) {
//         throw new AppError(
//           httpStatus.FORBIDDEN,
//           'This plan is not valid for your account type',
//         );
//       }

//       // ─── Cancelled ───────────────────────────────────────────
//       if (status === 'cancelled') {
//         throw new AppError(
//           httpStatus.PAYMENT_REQUIRED,
//           'Your subscription has been cancelled. Please subscribe again',
//         );
//       }

//       // ─── Trial expired ───────────────────────────────────────
//       if (status === 'trialing' && expiresAt && new Date() > expiresAt) {
//         await User.findByIdAndUpdate(userId, {
//           'subscription.status': 'expired',
//         });
//         throw new AppError(
//           httpStatus.PAYMENT_REQUIRED,
//           'Your free trial has ended. Please subscribe to continue',
//         );
//       }

//       // ─── Expired ─────────────────────────────────────────────
//       if (status === 'expired') {
//         throw new AppError(
//           httpStatus.PAYMENT_REQUIRED,
//           'Your subscription has expired. Please renew to continue',
//         );
//       }

//       // ─── Plan hierarchy check ─────────────────────────────────
//       const userPlanLevel = PLAN_HIERARCHY[userPlanName] ?? 0;
//       const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan];

//       if (userPlanLevel < requiredPlanLevel) {
//         throw new AppError(
//           httpStatus.FORBIDDEN,
//           `This feature requires '${requiredPlan}' plan or higher. Please upgrade your plan.`,
//         );
//       }

//       next();
//     } catch (error) {
//       next(error);
//     }
//   };
// };

// export default checkSubscription;

// src/app/middlewares/checkSubscription.ts
import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import User from '../modules/user/user.model';
import AppError from '../error/AppError';

const PLAN_HIERARCHY: Record<string, number> = {
  starter: 1,
  free: 2,
  pro: 3,
};

type PlanName = 'starter' | 'free' | 'pro';

const checkSubscription = (requiredPlan: PlanName | PlanName[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user._id;

      // ─── SubscriptionPlan populate করো ──────────────────────
      const user = await User.findById(userId).populate('subscription.plan');
      if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

      // ─── Admin bypass ────────────────────────────────────────
      if (user.role === 'admin') return next();

      const status = user.subscription?.status;
      const expiresAt = user.subscription?.expiresAt;
      const planDoc = user.subscription?.plan as any;
      const userPlanName: string = planDoc?.name?.toLowerCase();

      // ─── Subscription নেই ────────────────────────────────────
      if (!status || status === 'none' || !planDoc) {
        throw new AppError(
          httpStatus.PAYMENT_REQUIRED,
          'Please subscribe to access this feature',
        );
      }

      // ─── Plan এর role user এর role এর সাথে match করে কিনা ───
      if (planDoc.role && planDoc.role !== user.role) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'This plan is not valid for your account type',
        );
      }

      // ─── Cancelled ───────────────────────────────────────────
      if (status === 'cancelled') {
        throw new AppError(
          httpStatus.PAYMENT_REQUIRED,
          'Your subscription has been cancelled. Please subscribe again',
        );
      }

      // ─── Trial expired ───────────────────────────────────────
      if (status === 'trialing' && expiresAt && new Date() > expiresAt) {
        await User.findByIdAndUpdate(userId, {
          'subscription.status': 'expired',
        });
        throw new AppError(
          httpStatus.PAYMENT_REQUIRED,
          'Your free trial has ended. Please subscribe to continue',
        );
      }

      // ─── Active but expired ───────────────────────────────────
      if (status === 'active' && expiresAt && new Date() > expiresAt) {
        await User.findByIdAndUpdate(userId, {
          'subscription.status': 'expired',
        });
        throw new AppError(
          httpStatus.PAYMENT_REQUIRED,
          'Your subscription has expired. Please renew to continue',
        );
      }

      // ─── Expired ─────────────────────────────────────────────
      if (status === 'expired') {
        throw new AppError(
          httpStatus.PAYMENT_REQUIRED,
          'Your subscription has expired. Please renew to continue',
        );
      }

      // ─── Plan hierarchy check ─────────────────────────────────
      const userPlanLevel = PLAN_HIERARCHY[userPlanName] ?? 0;

      if (Array.isArray(requiredPlan)) {
        // একাধিক plan — যেকোনো একটা match হলেই চলবে
        const hasAccess = requiredPlan.some(
          (plan) => userPlanLevel >= PLAN_HIERARCHY[plan],
        );
        if (!hasAccess) {
          throw new AppError(
            httpStatus.FORBIDDEN,
            `This feature requires '${requiredPlan.join(' or ')}' plan. Please upgrade your plan.`,
          );
        }
      } else {
        // একটা plan
        if (userPlanLevel < PLAN_HIERARCHY[requiredPlan]) {
          throw new AppError(
            httpStatus.FORBIDDEN,
            `This feature requires '${requiredPlan}' plan or higher. Please upgrade your plan.`,
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default checkSubscription;