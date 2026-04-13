import { Cart } from "./addtotocard.model";

const getCart = async (userId: string) => {
  const cart = await Cart.findOne({ user: userId }).populate(
    "items.product",
    "name price images discount"
  );
  return cart || { user: userId, items: [] };
};
 
const addToCart = async (
  userId: string,
  productId: string,
  quantity: number,
  color?: string,
  size?: string
) => {
  let cart = await Cart.findOne({ user: userId });
 
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
 
  // Check if same product+color+size already in cart
  const existingIndex = cart.items.findIndex(
    (item: any) =>
      item.product.toString() === productId &&
      item.color === (color || "") &&
      item.size === (size || "")
  );
 
  if (existingIndex > -1) {
    // Update quantity
    cart.items[existingIndex].quantity += quantity;
  } else {
    cart.items.push({ product: productId as any, quantity, color, size });
  }
 
  await cart.save();
  return cart.populate("items.product", "name price images discount");
};
 
const updateCartItem = async (
  userId: string,
  productId: string,
  quantity: number,
  color?: string,
  size?: string
) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");
 
  const item = cart.items.find(
    (i: any) =>
      i.product.toString() === productId &&
      i.color === (color || "") &&
      i.size === (size || "")
  );
 
  if (!item) throw new Error("Item not found in cart");
 
  if (quantity <= 0) {
    // Remove item
    cart.items = cart.items.filter(
      (i: any) =>
        !(
          i.product.toString() === productId &&
          i.color === (color || "") &&
          i.size === (size || "")
        )
    );
  } else {
    item.quantity = quantity;
  }
 
  await cart.save();
  return cart.populate("items.product", "name price images discount");
};
 
const removeFromCart = async (userId: string, productId: string) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");
 
  cart.items = cart.items.filter(
    (i: any) => i.product.toString() !== productId
  );
 
  await cart.save();
  return cart.populate("items.product", "name price images discount");
};
 
const clearCart = async (userId: string) => {
  return await Cart.findOneAndUpdate(
    { user: userId },
    { items: [] },
    { new: true }
  );
};
 
export const cartService = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};