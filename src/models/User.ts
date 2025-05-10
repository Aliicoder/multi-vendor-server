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
    businessName: { type: String },
    media: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    boarded: { type: Boolean, default: false },
    sellerStatus: {
      type: String,
      enum: ["active", "inactive", "pending"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "fulfilled"],
    },
    roles: [
      {
        type: String,
        enum: ["admin", "client", "seller", "courier"],
        default: ["client"],
      },
    ],
    method: { type: String, enum: ["standard", "google"], default: "standard" },
    description: { type: String },
    refreshToken: { type: String },
    googleId: { type: String },
    addresses: { type: [AddressSchema] },
    businessAddresses: { type: [AddressSchema] },
    emailOtp: { type: String },
    emailOtpExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
