import { Router } from 'express';
import { authRoutes } from '../modules/auth/user.routes';
import { userRoutes } from '../modules/user/user.routes';
import { adminRoutes } from '../modules/Dashboard/admin/admin.route';
import { sosaleMediaRoutes } from '../modules/sociallink/social.routes';
import { eventRoutes } from '../modules/event/event.routes';
import { productsRoutes } from '../modules/product/product.routes';




const router = Router();
const moduleRoutes = [
  // {
  //   path: '/users',
  //   route: userRoutes,
  // },

  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/admin',
    route: adminRoutes,
  },
  {
    path: '/social',
    route: sosaleMediaRoutes,
  },
    {
    path: '/event',
    route: eventRoutes,
  },
   {
    path: '/products',
    route: productsRoutes,
  },
//   {
//     path: '/subscription',
//     route: SubscriptionRoutes,
//   },
//   {
//     path: '/payment',
//     route: PaymentRoutes,
//   },
//   {
//     path: '/otp',
//     route: otpRoutes,
//   },
//   {
//     path: '/wallet',
//     route: walletRoutes,
//   },
//   {
//     path: '/notifications',
//     route: NotificationRoutes,
//   },
//   {
//     path: '/onboarding',
//     route: onboardingRoutes,
//   },
];
moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
