import { Router } from "express";
import { ProductCategoryController } from "./ProductCategory.controller";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth.middleware";


const router = Router();

// ─── Admin Routes ──────────────────────────────────────────────────────────────
router.post(
  "/create-category-product",
  auth(UserRole.USER),
  ProductCategoryController.createProductCategory
);

router.patch(
  "/:id",
  auth(UserRole.admin),
  ProductCategoryController.updateProductCategory
);

router.delete(
  "/:id",
  auth(UserRole.admin),
  ProductCategoryController.deleteProductCategory
);

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.get("/product-category",auth(UserRole.USER), ProductCategoryController.getAllProductCategories);

router.get("/category/:id", auth(UserRole.USER), ProductCategoryController.getProductCategoryById);

router.get("/products/:categoryId", auth(UserRole.USER), ProductCategoryController.getProductsByCategoryId);

export const ProductCategoryRoutes = router;