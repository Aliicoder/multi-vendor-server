import { Schema, model, Types } from "mongoose";
import { IOrder } from "../types/schema";

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    amount: { type: Number, required: true },
    quantity: { type: Number, required: true },
    shopName: { type: String, required: true },
    deliveryStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "paypal"],
      required: true,
    },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    cartId: { type: Schema.Types.ObjectId, ref: "Cart" },
  },
  { timestamps: true }
);

export const Order = model<IOrder>("Order", OrderSchema);
