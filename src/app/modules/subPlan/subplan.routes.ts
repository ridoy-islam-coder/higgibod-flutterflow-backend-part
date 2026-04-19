import express from "express";
import { planControllers } from "./subplan.controller";


const router = express.Router();

router.post("/create-plan",  planControllers.createPlan);
router.get("/getall-plans", planControllers.getAllPlans);
router.get("/:id", planControllers.getSinglePlan);
router.patch("/:id", planControllers.updatePlan);
router.delete("/:id", planControllers.deletePlan);

export const PlanRoutes = router;