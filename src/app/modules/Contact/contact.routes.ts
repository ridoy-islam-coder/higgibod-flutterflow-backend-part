import { Router } from "express";
import { ContactController } from "./contact.controller";

 
const router = Router();
 
// Public
router.post("/",  ContactController.create);
 
// Admin
router.get("/stats", ContactController.stats);
router.get("/", ContactController.getAll);
router.get("/:id", ContactController.getOne);
router.patch("/:id/status", ContactController.updateStatus);
router.delete("/:id", ContactController.remove);
 
export const ContactRoutes = router;
 