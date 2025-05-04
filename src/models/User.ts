import mongoose, { Schema } from "mongoose";
import { IAddress, IUser } from "../types/schema";

const AddressSchema = new Schema<IAddress>({
  lng: { type: Number },
  lat: { type: Number },
  city: { type: String },
  street: { type: String },
  phone: { type: String },
  province: { type: String },
});

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    media: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    sellerStatus: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "fulfilled"],
      default: "pending",
    },
    roles: [
      {
        type: String,
        enum: ["admin", "client", "seller", "courier"],
        default: ["client"],
      },
    ],
    method: { type: String, enum: ["standard", "google"], default: "standard" },
    description: { type: String, default: "" },
    refreshToken: { type: String },
    googleId: { type: String },
    addresses: { type: [AddressSchema], default: [] },
    businessAddresses: { type: [AddressSchema], default: [] },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
