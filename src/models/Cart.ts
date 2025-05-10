import { Schema, model } from "mongoose";
import { ICart, ICartOrder, IUnit } from "../types/schema";

export const UnitSchema = new Schema<IUnit>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    shopName: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<ICartOrder>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    units: { type: [UnitSchema], required: true },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

OrderSchema.virtual("amount").get(function (this: ICartOrder) {
  return this.units.reduce((sum, unit) => {
    return sum + unit.quantity * unit.price;
  }, 0);
});

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["active", "settled"], default: "active" },
    orders: { type: [OrderSchema], required: true },
    paypalOrderId: { type: String },
    transactionIds: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CartSchema.virtual("totalAmount").get(function (this: any) {
  return this.orders.reduce((total: number, order: ICartOrder) => {
    return total + order?.amount!;
  }, 0);
});

CartSchema.virtual("totalQuantity").get(function (this: any) {
  return this.orders.reduce((total: number, order: ICartOrder) => {
    const unitsTotal = order.units.reduce(
      (sum, unit) => sum + unit.quantity,
      0
    );
    return total + unitsTotal;
  }, 0);
});

const Cart = model<ICart>("Cart", CartSchema);

export default Cart;
