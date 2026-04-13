
import { Router } from "express";
import { USER_ROLE } from "../user/user.constant";
import upload from "../../middleware/fileUpload";
import auth from "../../middleware/auth.middleware";
import {  productController } from "./product.controller";


const router = Router();


router.get("/products", auth(USER_ROLE.USER,),productController.getAllProducts);           // Manage Products list
router.get("/products/:id", auth(USER_ROLE.USER,), productController.getProductDetails);   // Product Details
router.post("/products", auth(USER_ROLE.USER,), upload.array("images", 10), productController.createProduct);  // Add Product
router.put("/products/:id", auth(USER_ROLE.USER,), upload.array("images", 10), productController.updateProduct); // Edit Product
router.delete("/products/:id", auth(USER_ROLE.USER,), productController.deleteProduct);    // Delete Product
router.post("/products/:id/review", auth(USER_ROLE.USER,), productController.addProductReview); // Add Review

export const productsRoutes = router;