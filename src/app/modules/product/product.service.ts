import mongoose from "mongoose";
import AppError from "../../error/AppError";
import { Order } from "../userOrder/userOrder.model";
import { Product } from "./product.model";


// ✅ Get All Products
export const getAllProductsService = async (req: any) => {
  const userId = req.user?.id;
  const products = await Product.find({ host: userId })
    .populate("host", "fullName image")
    .sort({ createdAt: -1 });
  return products;
};

// ✅ Get Product Details
export const getProductDetailsService = async (id: string) => {
  const product = await Product.findById(id)
    .populate("host", "fullName image")
    .populate("reviews.user", "fullName image");
  if (!product) throw new AppError(404, "Product not found");
  return product;
};

// ✅ Create Product
export const createProductService = async (
  req: any,
  images: { id: string; url: string }[]
) => {
  const userId = req.user?.id;
  const {
    name,
    category,
    description,
    price,
    discount,
    tax,
    shippingCost,
    colors,
    sizes,
  } = req.body;

  if (!name || !category || !price)
    throw new AppError(400, "Name, category and price are required");

  const product = await Product.create({
    name,
    category,
    description: description || "",
    price: Number(price),
    discount: Number(discount) || 0,
    tax: Number(tax) || 0,
    shippingCost: Number(shippingCost) || 0,
    colors: colors ? JSON.parse(colors) : [],
    sizes: sizes ? JSON.parse(sizes) : [],
    images: images || [],
    host: userId,
  });

  return product;
};

// ✅ Update Product
export const updateProductService = async (
  req: any,
  images?: { id: string; url: string }[]
) => {
  const { id } = req.params;
  const {
    name,
    category,
    description,
    price,
    discount,
    tax,
    shippingCost,
    colors,
    sizes,
  } = req.body;

  const updateData: any = {
    ...(name && { name }),
    ...(category && { category }),
    ...(description && { description }),
    ...(price && { price: Number(price) }),
    ...(discount && { discount: Number(discount) }),
    ...(tax && { tax: Number(tax) }),
    ...(shippingCost && { shippingCost: Number(shippingCost) }),
    ...(colors && { colors: JSON.parse(colors) }),
    ...(sizes && { sizes: JSON.parse(sizes) }),
    ...(images && images.length > 0 && { images }),
  };

  const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
  if (!product) throw new AppError(404, "Product not found");
  return product;
};

// ✅ Delete Product
export const deleteProductService = async (id: string) => {
  const product = await Product.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!product) throw new AppError(404, "Product not found");
  return { message: "Product deleted successfully" };
};

// ✅ Add Review
export const addProductReviewService = async (req: any) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment)
    throw new AppError(400, "Rating and comment are required");

  const product = await Product.findById(id);
  if (!product) throw new AppError(404, "Product not found");

  const alreadyReviewed = product.reviews?.some(
    (review: any) => review.user.toString() === userId
  );
  if (alreadyReviewed)
    throw new AppError(400, "You have already reviewed this product");

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { $push: { reviews: { user: userId, rating: Number(rating), comment } } },
    { new: true }
  ).populate("reviews.user", "fullName image");

  return updatedProduct;
};


















const getTrendingProducts = async (limit = 8) => {
  const products = await Product.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $addFields: {
        reviewCount: { $size: "$reviews" },
        avgRating: { $avg: "$reviews.rating" },
      },
    },
    { $sort: { reviewCount: -1, avgRating: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "host",
        foreignField: "_id",
        as: "host",
        pipeline: [{ $project: { name: 1, profileImage: 1 } }],
      },
    },
    { $unwind: { path: "$host", preserveNullAndEmptyArrays: true } },
  ]);
 
  return products;
};
 
 
const getFeaturedProducts = async (limit = 5) => {
  const products = await Product.aggregate([
    { $match: { isDeleted: { $ne: true }, "reviews.0": { $exists: true } } },
    {
      $addFields: {
        avgRating: { $avg: "$reviews.rating" },
      },
    },
    { $sort: { avgRating: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "host",
        foreignField: "_id",
        as: "host",
        pipeline: [{ $project: { name: 1, profileImage: 1 } }],
      },
    },
    { $unwind: { path: "$host", preserveNullAndEmptyArrays: true } },
  ]);
 
  return products;
};




 
const getRelatedProducts = async (
  productId: string,
  category: string,
  limit = 6
) => {
  return await Product.find({
    _id: { $ne: productId },
    category: { $regex: category, $options: "i" },
    isDeleted: { $ne: true },
  })
    .populate("host", "name profileImage")
    .limit(limit);
};
 
 
const getProductCategories = async () => {
  const categories = await Product.distinct("category", {
    isDeleted: { $ne: true },
  });
  return categories.filter(Boolean);
};





// 📊 DASHBOARD SERVICE
// 📊 SUMMARY SERVICE
export const getDashboardSummaryService = async (req: any) => {
  const adminId = req.user.id;

  const totalProducts = await Product.countDocuments({
    host: adminId,
  });

  const orders = await Order.find();

  let totalOrders = 0;
  let totalSales = 0;

  for (const order of orders) {
    let isAdminOrder = false;

    for (const item of order.items) {
      const product = await Product.findById(item.product);

      if (product && product.host.toString() === adminId) {
        isAdminOrder = true;

        totalSales += item.price * item.quantity;
      }
    }

    if (isAdminOrder) {
      totalOrders++;
    }
  }

  return {
    totalOrders,
    totalProducts,
    totalSales,
  };
};


export const getMonthlyEarningsService = async (req: any) => {
  const adminId = req.user?.id;

  const orders = await Order.find()
    .populate("items.product", "host price quantity");

  const monthlyMap: Record<number, number> = {};

  orders.forEach((order: any) => {
    const adminItems = order.items.filter(
      (item: any) =>
        item.product?.host?.toString() === adminId
    );

    if (adminItems.length > 0) {
      const month = new Date(order.createdAt).getMonth() + 1;

      let total = 0;

      adminItems.forEach((item: any) => {
        total += item.price * item.quantity;
      });

      monthlyMap[month] = (monthlyMap[month] || 0) + total;
    }
  });

  return Object.keys(monthlyMap).map((m) => ({
    month: Number(m),
    total: monthlyMap[Number(m)],
  }));
};


export const productServices = {
    getAllProductsService,
    getProductDetailsService,
    createProductService,
    updateProductService,
    deleteProductService,
    addProductReviewService,
    // extra features
  getTrendingProducts,
  getFeaturedProducts,
  getRelatedProducts,
  getProductCategories,
  getDashboardSummaryService,
  getMonthlyEarningsService,
};
