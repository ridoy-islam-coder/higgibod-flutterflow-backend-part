// personalization.routes.ts
import { Router } from "express";
import { USER_ROLE } from "../user/user.constant";
import auth from "../../middleware/auth.middleware";
import { personalizationController } from "./Personalization.controller";


const router = Router();

// GET  /personalization/status  — app open e check korbe, completed ki na
router.get(
  "/status",
  auth(USER_ROLE.USER),
  personalizationController.checkPersonalizationStatus
);

// GET  /personalization         — user er saved personalization data
router.get(
  "/",
  auth(USER_ROLE.USER),
  personalizationController.getPersonalization
);

// POST /personalization         — step by step save
// body: { interests?, skillLevel?, yearsSkating? }
router.post(
  "/",
  auth(USER_ROLE.USER),
  personalizationController.savePersonalization
);

// PATCH /personalization/complete  — last step e "Next" press korle
router.patch(
  "/complete",
  auth(USER_ROLE.USER),
  personalizationController.completePersonalization
);



export const personalizationRoutes = router;

