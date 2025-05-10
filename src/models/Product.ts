import mongoose, { Schema, models, model } from "mongoose";
import { IMedia, IProduct } from "../types/schema";

const mediaSchema = new Schema<IMedia>(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  {
    _id: false,
  }
);

export const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: { type: [String], required: true },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    sales: { type: Number, default: 0 },
    shopName: { type: String, required: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    media: { type: [mediaSchema], required: true },
    discount: { type: Number, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    rating: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);
productSchema.index(
  {
    name: "text",
    category: "text",
    brand: "text",
    description: "text",
  },
  {
    weights: {
      name: 5,
      Category: 4,
      brand: 3,
      description: 2,
    },
  }
);
const Product = models.Product || model<IProduct>("Product", productSchema);
export default Product;
