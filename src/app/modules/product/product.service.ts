import mongoose, { Types } from "mongoose";
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


















// const getTrendingProducts = async (limit = 8) => {
//   const products = await Product.aggregate([
//     { $match: { isDeleted: { $ne: true } } },
//     {
//       $addFields: {
//         reviewCount: { $size: "$reviews" },
//         avgRating: { $avg: "$reviews.rating" },
//       },
//     },
//     { $sort: { reviewCount: -1, avgRating: -1 } },
//     { $limit: limit },
//     {
//       $lookup: {
//         from: "users",
//         localField: "host",
//         foreignField: "_id",
//         as: "host",
//         pipeline: [{ $project: { name: 1, profileImage: 1 } }],
//       },
//     },
//     { $unwind: { path: "$host", preserveNullAndEmptyArrays: true } },
//   ]);
 
//   return products;
// };
 




const getTrendingProducts = async (
  productId: string | undefined,
  categoryIds: string[],
  page = 1,
  limit = 10,
) => {
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    isDeleted: { $ne: true },
  };

  // productId dile current product ta bade debo
  if (productId) {
    query._id = { $ne: new Types.ObjectId(productId) };
  }

  // categoryIds dile filter korbo — na dile all products asbe
  if (categoryIds.length > 0) {
    query.category = {
      $in: categoryIds.map((id) => new Types.ObjectId(id)),
    };
  }

  const total = await Product.countDocuments(query);

  const products = await Product.find(query)
    .populate('category', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
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






//review product api 




export const addproducetReviewService = async (req: any) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment)
    throw new AppError(400, "Rating and comment are required");

  const event = await Product.findById(id);
  if (!event) throw new AppError(404, "Event not found");

  const alreadyReviewed = event.reviews?.some(
    (review: any) => review.user.toString() === userId
  );
  if (alreadyReviewed)
    throw new AppError(400, "You have already reviewed this event");

  const updatedEvent = await Product.findByIdAndUpdate(
    id,
    { $push: { reviews: { user: userId, rating: Number(rating), comment } } },
    { new: true }
  ).populate("reviews.user", "fullName image");

  return updatedEvent;
};

















// ── Home Dashboard ─────────────────────────────────────────────────────────────




// ── Home Dashboard ─────────────────────────────────────────────────────────────
const getProductDashboard = async (
  userId: string,
  year?: number,
  page: number = 1,
  limit: number = 10
) => {
  const targetYear = year || new Date().getFullYear();
  const skip = (page - 1) * limit;
 
  // আমার সব product IDs
  const myProducts = await Product.find(
    { host: userId, isDeleted: false },
    { _id: 1 }
  );
  const productIds = myProducts.map((p) => p._id);
 
  // ── Total Products Count ──────────────────────────────────
  const totalProducts = productIds.length;
 
  // ── Total Sales & Earning ─────────────────────────────────
  const totalSalesResult = await Order.aggregate([
    {
      $match: {
        "items.product": { $in: productIds },
        paymentStatus: "paid",
        isDeleted: false,
      },
    },
    { $unwind: "$items" },
    { $match: { "items.product": { $in: productIds } } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$items.quantity" },
        totalEarning: {
          $sum: { $multiply: ["$items.price", "$items.quantity"] },
        },
      },
    },
  ]);
 
  const totalSales = totalSalesResult[0]?.totalSales || 0;
  const totalEarning = totalSalesResult[0]?.totalEarning || 0;
 



  // ── Monthly Earning ───────────────────────────────────────
  const monthlyEarningRaw = await Order.aggregate([
    {
      $match: {
        "items.product": { $in: productIds },
        paymentStatus: "paid",
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${targetYear}-01-01`),
          $lte: new Date(`${targetYear}-12-31`),
        },
      },
    },
    { $unwind: "$items" },
    { $match: { "items.product": { $in: productIds } } },
    {
      $group: {
        _id: { $month: "$createdAt" },
        earning: {
          $sum: { $multiply: ["$items.price", "$items.quantity"] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
 
  const monthlyEarning = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyEarningRaw.find((m) => m._id === i + 1);
    return {
      month: i + 1,
      monthName: new Date(targetYear, i, 1).toLocaleString("en", {
        month: "short",
      }),
      earning: found?.earning || 0,
    };
  });
 
  // ── Recent Orders with pagination ─────────────────────────
  const totalOrders = await Order.countDocuments({
    "items.product": { $in: productIds },
    isDeleted: false,
  });
 
  const recentOrders = await Order.find({
    "items.product": { $in: productIds },
    isDeleted: false,
  })
    .populate({ path: "items.product", select: "name images price" })
    .populate("user", "fullName image email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("items subtotal total orderStatus paymentStatus createdAt");
 
  return {
    totalProducts,
    totalSales,
    totalEarning,
    year: targetYear,
    monthlyEarning,
    recentOrders,
    pagination: {
      total: totalOrders,
      page,
      limit,
      totalPages: Math.ceil(totalOrders / limit),
    },
  };
};
 


 
// ── Earning Overview with pagination ──────────────────────────────────────────
const getEarningOverview = async (
  userId: string,
  year?: number,
  page: number = 1,
  limit: number = 10
) => {
  const targetYear = year || new Date().getFullYear();
  const skip = (page - 1) * limit;
 
  const myProducts = await Product.find({ host: userId, isDeleted: false }, { _id: 1 });
  const productIds = myProducts.map((p) => p._id);
 
  const totalResult = await Order.aggregate([
    { $match: { "items.product": { $in: productIds }, paymentStatus: "paid", isDeleted: false } },
    { $unwind: "$items" },
    { $match: { "items.product": { $in: productIds } } },
    {
      $group: {
        _id: null,
        totalEarning: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
  ]);
  const totalEarning = totalResult[0]?.totalEarning || 0;
 
  const monthlyRaw = await Order.aggregate([
    {
      $match: {
        "items.product": { $in: productIds },
        paymentStatus: "paid",
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${targetYear}-01-01`),
          $lte: new Date(`${targetYear}-12-31`),
        },
      },
    },
    { $unwind: "$items" },
    { $match: { "items.product": { $in: productIds } } },
    {
      $group: {
        _id: { $month: "$createdAt" },
        earning: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
 
  const monthlyEarning = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyRaw.find((m) => m._id === i + 1);
    return {
      month: i + 1,
      monthName: new Date(targetYear, i, 1).toLocaleString("en", { month: "short" }),
      earning: found?.earning || 0,
    };
  });
 
  const totalTransactions = await Order.countDocuments({
    "items.product": { $in: productIds },
    paymentStatus: "paid",
    isDeleted: false,
  });
 
  const recentTransactions = await Order.find({
    "items.product": { $in: productIds },
    paymentStatus: "paid",
    isDeleted: false,
  })
    .populate({ path: "items.product", select: "name images" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("total createdAt orderStatus");
 
  return {
    totalEarning,
    year: targetYear,
    monthlyEarning,
    recentTransactions,
    pagination: {
      total: totalTransactions,
      page,
      limit,
      totalPages: Math.ceil(totalTransactions / limit),
    },
  };
};
 
// ── Order List with filter ────────────────────────────────────────────────────
const getMyOrders = async (
  userId: string,
  status?: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;
 
  const myProducts = await Product.find({ host: userId, isDeleted: false }, { _id: 1 });
  const productIds = myProducts.map((p) => p._id);
 
  const filter: any = { "items.product": { $in: productIds }, isDeleted: false };
  if (status) filter.orderStatus = status;
 
  const total = await Order.countDocuments(filter);
 
  const orders = await Order.find(filter)
    .populate({ path: "items.product", select: "name images price" })
    .populate("user", "fullName image email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
 
  return {
    orders,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

 
// ── Update Order Status ───────────────────────────────────────────────────────
const updateOrderStatus = async (
  userId: string,
  orderId: string,
  orderStatus: string
) => {
  const myProducts = await Product.find(
    { host: userId, isDeleted: false },
    { _id: 1 }
  );
  const productIds = myProducts.map((p) => p._id);
 
  const order = await Order.findOneAndUpdate(
    { _id: orderId, "items.product": { $in: productIds } },
    { $set: { orderStatus } },
    { new: true }
  );
 
  if (!order) throw new Error("Order not found");
  return order;
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
  addproducetReviewService,
  getProductDashboard,
  getEarningOverview,
  getMyOrders,
  updateOrderStatus,
};
