// product.model.ts
import { model, Schema } from "mongoose";
import { IProduct, IReview } from "./product.interface";


const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    colors: [{ type: String }],
    sizes: [{ type: String }],
    images: [
      {
        id: { type: String },
        url: { type: String },
      },
    ],
    host: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviews: [reviewSchema],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

productSchema.pre("find", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

productSchema.pre("findOne", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Product = model<IProduct>("Product", productSchema);