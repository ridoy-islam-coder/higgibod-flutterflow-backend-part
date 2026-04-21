import { Router } from 'express';
import { authRoutes } from '../modules/auth/user.routes';
import { userRoutes } from '../modules/user/user.routes';
import { adminRoutes } from '../modules/Dashboard/admin/admin.route';
import { sosaleMediaRoutes } from '../modules/sociallink/social.routes';
import { eventRoutes } from '../modules/event/event.routes';
import { productsRoutes } from '../modules/product/product.routes';
import { ticketRoutes } from '../modules/Ticke/ticke.routes';
import { orderRoutes } from '../modules/userOrder/userOrder.routes';
import { cartRoutes } from '../modules/addtocard/addtocard.routes';
import { personalizationRoutes } from '../modules/Personalizationuser/Personalization.routes';
import { wishlistRoutes } from '../modules/Wishlist/wishlist.routes';
import { PlanRoutes } from '../modules/subPlan/subplan.routes';
import { PaymentRoutes } from '../modules/subPayment/subpayment.routes';
import { eventWishlistRoutes } from '../modules/Eventwishlist/wishlist.routes';
import { PromoCodeRoutes } from '../modules/PromoCode/promocode.routes';
// import { PromoCodeRoutes } from '../modules/PromoCode/promocode.routes';




const router = Router();
const moduleRoutes = [
  {
    path: '/users',
    route: userRoutes,
  },

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
  },{
    path: '/tickets',
    route: ticketRoutes,
  },
  {
    path: '/products',
    route: productsRoutes,
  },
    {
    path: '/order',
    route: orderRoutes,
  },
  {
    path: '/card',
    route: cartRoutes,
  },
  {
    path: '/personalization',
    route: personalizationRoutes,
  },
    {
    path: '/wishlist',
    route: wishlistRoutes,
  },
     {
    path: '/plans',
    route: PlanRoutes,
  },
   {
    path: '/subscription',
    route: PaymentRoutes,
  },
   {
    path: '/eventWishlist',
    route: eventWishlistRoutes,
  },
    {
    path: '/promocode',
    route: PromoCodeRoutes,
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
