import catchAsync from "../../utils/catchAsync";
import { uploadManyToS3 } from "../../utils/fileHelper";
import sendResponse from "../../utils/sendResponse";
import { productServices } from "./product.service";
import httpStatus  from 'http-status';



export const getAllProducts = catchAsync(async (req, res) => {
  const result = await productServices.getAllProductsService(req);
  sendResponse(res, { statusCode: 200, success: true, message: "Products fetched successfully", data: result });
});

export const getProductDetails = catchAsync(async (req, res) => {
  const result = await productServices.getProductDetailsService(req.params.id as string);
  sendResponse(res, { statusCode: 200, success: true, message: "Product details fetched successfully", data: result });
});

export const createProduct = catchAsync(async (req, res) => {
  let images: { id: string; url: string }[] = [];

  if (req.files && (req.files as any[]).length > 0) {
    images = await uploadManyToS3(
      (req.files as any[]).map((file: any) => ({
        file,
        path: "products/images",
      }))
    );
  }

  const result = await productServices.createProductService(req, images);
  sendResponse(res, { statusCode: 201, success: true, message: "Product created successfully", data: result });
});

export const updateProduct = catchAsync(async (req, res) => {
  let images: { id: string; url: string }[] = [];

  if (req.files && (req.files as any[]).length > 0) {
    images = await uploadManyToS3(
      (req.files as any[]).map((file: any) => ({
        file,
        path: "products/images",
      }))
    );
  }

  const result = await productServices.updateProductService(req, images);
  sendResponse(res, { statusCode: 200, success: true, message: "Product updated successfully", data: result });
});

export const deleteProduct = catchAsync(async (req, res) => {
  const result = await productServices.deleteProductService(req.params.id as string);
  sendResponse(res, { statusCode: 200, success: true, message: "Product deleted successfully", data: result });
});

export const addProductReview = catchAsync(async (req, res) => {
  const result = await productServices.addProductReviewService(req);
  sendResponse(res, { statusCode: 200, success: true, message: "Review added successfully", data: result });
});














// ✅ Exporting all controller functions as an object


// const getTrending = catchAsync(async (req, res) => {
//   const result = await productServices.getTrendingProducts(
//     req.query.limit ? Number(req.query.limit) : 8
//   );
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Trending products fetched",
//     data: result,
//   });
// });
 // নতুন — 4টা parameter


const getTrending = catchAsync(async (req, res) => {
  const categoryIds = (req.query.categoryIds as string)?.split(',').filter(Boolean) || [];

  // productId optional — na dile undefined pathabo
  const productId = req.params.productId || undefined;

  const result = await productServices.getTrendingProducts(
    productId as string | undefined,
    categoryIds,
    req.query.page ? Number(req.query.page) : 1,
    req.query.limit ? Number(req.query.limit) : 10,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Products fetched successfully',
    data: result,
  });
});


 
const getFeatured = catchAsync(async (req, res) => {
  const result = await productServices.getFeaturedProducts(
    req.query.limit ? Number(req.query.limit) : 5
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Featured products fetched",
    data: result,
  });
});
 
 
const getRelated = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { category } = req.query;
 
  if (!category) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "category query param required",
      data: null,
    });
  }
 
  const result = await productServices.getRelatedProducts(
    id as string,
    category as string
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Related products fetched",
    data: result,
  });
});
 
 
const getCategories = catchAsync(async (req, res) => {
  const result = await productServices.getProductCategories();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product categories fetched",
    data: result,
  });
});
 
//dasbord extra features end here


// 📊 GET DASHBOARD DATA (SUMMARY + MONTHLY)
export const getDashboardSummary = catchAsync(async (req, res) => {
  const result = await productServices.getDashboardSummaryService(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard summary fetched successfully",
    data: result,
  });
});




export const getMonthlyEarnings = catchAsync(async (req, res) => {
  const result = await productServices.getMonthlyEarningsService(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Monthly earnings fetched successfully",
    data: result,
  });
});



export const productController = {
    getAllProducts,
    getProductDetails,
    createProduct,
    updateProduct,
    deleteProduct,
    addProductReview,
    // extra features
   getTrending,
   getFeatured,
   getRelated,
   getCategories,
  getDashboardSummary,
  getMonthlyEarnings,
};
