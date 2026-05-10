import { Router } from "express";
import { ProductCategoryController } from "./ProductCategory.controller";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth.middleware";


const router = Router();

// ─── Admin Routes ──────────────────────────────────────────────────────────────
router.post(
  "/create-category-product",
  auth(UserRole.USER,UserRole.admin),
  ProductCategoryController.createProductCategory
);

router.patch( 
  "/product-update/:id",
  auth(UserRole.admin),
  ProductCategoryController.updateProductCategory
);

router.delete(
  "/product-delete/:id",
  auth(UserRole.admin,UserRole.admin),
  ProductCategoryController.deleteProductCategory
);

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.get("/product-category",auth(UserRole.USER,UserRole.MARCHANT,UserRole.admin), ProductCategoryController.getAllProductCategories);

router.get("/category/:id", auth(UserRole.USER,UserRole.MARCHANT,UserRole.admin), ProductCategoryController.getProductCategoryById);

router.get("/products/:categoryId", auth(UserRole.USER,UserRole.MARCHANT,UserRole.admin), ProductCategoryController.getProductsByCategoryId);

export const ProductCategoryRoutes = router;