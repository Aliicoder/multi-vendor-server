import { Schema, model } from "mongoose";
import { ITransaction } from "../types/schema";

const TransactionSchema = new Schema<ITransaction>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: "Order", required: true }],
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "paypal", "credit_card", "other"],
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: { type: Schema.Types.Mixed },
    cartId: { type: Schema.Types.ObjectId, ref: "Cart", required: true },
    paypalOrderId: { type: String },
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction>(
  "Transaction",
  TransactionSchema
);
