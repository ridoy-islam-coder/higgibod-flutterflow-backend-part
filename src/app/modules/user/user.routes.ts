import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import { USER_ROLE } from "./user.constant";
import { userControllers } from "./user.controller";
import validateRequest from "../../middleware/validateRequest";
import { authValidation } from "../auth/auth.validation";
import upload from "../../middleware/fileUpload";
import { UserRole } from "./user.interface";

const router = Router();






router.get("/getby-roll", auth(UserRole.USER, UserRole.MARCHANT, UserRole.KAATEDJ), userControllers.getUsersByRole);











router.get(
  '/me',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  userControllers.getme,
);



// For login user (user & admin both)
router.patch(
  '/update-profile',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  upload.single('image'),
  userControllers.updateProfile,
);
// //toatal user count
router.get(
  '/total-count',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  userControllers.getTotalUsersCount,
);
router.get(
  '/monthly-user-stats',
  auth(USER_ROLE.admin),
  userControllers.getMonthlyUserStats,
);
router.get(
  '/user-growth-overview',
  auth(USER_ROLE.admin),
  userControllers.getUserGrowthOverview,
);

// For admin to update others
// router.patch(
//   '/:id',
//   auth(USER_ROLE.admin, USER_ROLE.sup_admin),
// //   upload.single('file'),
//   userControllers.updateProfile,
// );

router.patch(
  '/phone/update',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  userControllers.updatePhoneNumber,
);
// router.get(
//   '/profile',
//   auth(USER_ROLE.agencies, USER_ROLE.influencer),
//   userControllers.getme,
// );
// Block user
router.patch(
  '/block/:id',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  userControllers.blockUser,
);

// Unblock user
router.patch(
  '/unblock/:id',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  userControllers.unblockUser,
);

router.get(
  '/:id',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  userControllers.getsingleUser,
);
router.get(
  '/',
  auth(USER_ROLE.USER, USER_ROLE.USER),
  userControllers.getAllUsers,
);

router.delete(
  '/delete-account',
  auth(USER_ROLE.USER, USER_ROLE.MARCHANT),
  validateRequest(authValidation.deleteAccountZodSchema),
  userControllers.deleteAccount,
);
export const userRoutes = router;