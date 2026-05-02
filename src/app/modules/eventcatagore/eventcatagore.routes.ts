import { Router } from "express";
import { USER_ROLE } from "../user/user.constant";
import auth from "../../middleware/auth.middleware";
import { categoryController } from "./eventcatagore.controller";
import upload from "../../middleware/fileUpload";


 
const router = Router();
 

router.get("/allcategories-event",auth(USER_ROLE.USER), categoryController.getAllCategories);

router.post("/categories-event",auth(USER_ROLE.USER,USER_ROLE.admin), upload.single('image'), categoryController.createCategory);

router.get("/details/:id",auth(USER_ROLE.USER), categoryController.getCategoryById);

router.patch("/update/:id",auth(USER_ROLE.USER), categoryController.updateCategory);

router.delete("/delete/:id",auth(USER_ROLE.USER), categoryController.deleteCategory);


//newapi

router.get("/getAllCategories", auth(USER_ROLE.USER), categoryController.getAllCategories);

router.get("/details/:id",auth(USER_ROLE.USER), categoryController.getCategoryByIdnew);

router.get("/events",auth(USER_ROLE.USER), categoryController.getEventsByCategoryId);
 
export const catagoreeventRoutes = router;