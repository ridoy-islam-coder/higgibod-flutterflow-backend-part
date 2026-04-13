import catchAsync from "../../utils/catchAsync";
import { uploadManyToS3 } from "../../utils/fileHelper";
import sendResponse from "../../utils/sendResponse";
import { productServices } from "./product.service";



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



export const productController = {
    getAllProducts,
    getProductDetails,
    createProduct,
    updateProduct,
    deleteProduct,
    addProductReview,
};
