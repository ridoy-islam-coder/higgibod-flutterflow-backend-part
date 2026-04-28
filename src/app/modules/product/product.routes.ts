
import { Router } from "express";
import { USER_ROLE } from "../user/user.constant";
import upload from "../../middleware/fileUpload";
import auth from "../../middleware/auth.middleware";
import {  productController } from "./product.controller";


const router = Router();


// router.get("/all", auth(USER_ROLE.USER,),productController.getAllProducts);           // Manage Products list
router.get("/product-details/:id", auth(USER_ROLE.USER,), productController.getProductDetails);   // Product Details
router.post("/create-products", auth(USER_ROLE.USER,), upload.array("images", 10), productController.createProduct);  // Add Product
router.put("/products/:id", auth(USER_ROLE.USER,), upload.array("images", 10), productController.updateProduct); // Edit Product
router.delete("/products/:id", auth(USER_ROLE.USER,), productController.deleteProduct);    // Delete Product
router.post("/review/:id", auth(USER_ROLE.USER,), productController.addProductReview); // Add Review





// ─────────────────────────────────────────────────────────────
// PRODUCT ROUTES (add to existing product router)
// ─────────────────────────────────────────────────────────────
// GET /products/trending
router.get("/all", auth(USER_ROLE.USER), productController.getTrending);
 
// GET /products/featured
router.get("/products/featured", auth(USER_ROLE.USER), productController.getFeatured);
 
// GET /products/categories
router.get("/products/categories", auth(USER_ROLE.USER), productController.getCategories);
 
// GET /products/:id/related?category=skates
router.get("/products/:id/related", auth(USER_ROLE.USER), productController.getRelated);


router.post("/product-review/:id", auth(USER_ROLE.USER,), productController.addproductReview);


// 📊 SUMMARY API (totalOrders, totalProducts, totalSales)
router.get("/summary",  auth(USER_ROLE.USER), productController.getDashboardSummary);


// 📈 MONTHLY EARNINGS API
router.get("/monthly", auth(USER_ROLE.USER), productController.getMonthlyEarnings);

//dasbord api 


 
// GET /api/v1/products/dashboard?year=2025
// Screen 1 — Home: Total Sales, Monthly Earning, Order List
router.get(
  "/dashboard",
  auth(USER_ROLE.USER),
  productController.getProductDashboard
);
 
// GET /api/v1/products/earning?year=2025
// Screen 2 — Earning: Total Earning, Monthly Chart, Recent Transactions
router.get(
  "/earning",
  auth(USER_ROLE.USER),
  productController.getEarningOverview
);
 
// GET /api/v1/products/orders?status=processing&page=1&limit=10
// Order list with filter
router.get(
  "/orders",
  auth(USER_ROLE.MARCHANT),
  productController.getMyOrders
);
 
// PATCH /api/v1/products/orders/:orderId/status
// Update order status (Mark Ready / Ship Now)
router.patch(
  "/orders/:orderId/status",
  auth(USER_ROLE.MARCHANT),
  productController.updateOrderStatus
);


export const productsRoutes = router;