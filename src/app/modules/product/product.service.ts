import AppError from "../../error/AppError";
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





export const productServices = {
    getAllProductsService,
    getProductDetailsService,
    createProductService,
    updateProductService,
    deleteProductService,
    addProductReviewService,
};
