import express from "express";
import { FollowController } from "./follow.controller";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth.middleware";

const router = express.Router();

// POST /api/v1/follow/:userId — follow/unfollow toggle
router.post(
  "/:userId",
  auth(UserRole.ORGANIZER, UserRole.MARCHANT, UserRole.USER, UserRole.KAATEDJ),
  FollowController.toggle
);

// GET /api/v1/follow/following — আমি কাদের follow করি
router.get(
  "/following",
  auth(UserRole.ORGANIZER, UserRole.MARCHANT, UserRole.USER, UserRole.KAATEDJ),
  FollowController.following
);

// GET /api/v1/follow/followers — আমার followers
router.get(
  "/followers",
  auth(UserRole.ORGANIZER, UserRole.MARCHANT, UserRole.USER, UserRole.KAATEDJ),
  FollowController.followers
);

// GET /api/v1/follow/status/:userId — follow status check
router.get(
  "/status/:userId",
  auth(UserRole.ORGANIZER, UserRole.MARCHANT, UserRole.USER, UserRole.KAATEDJ),
  FollowController.status
);

export const FollowRoutes = router;