import { Types } from "mongoose";

export type Role = "admin" | "client" | "seller" | "courier";
export type ISellerStatus = "active" | "inactive" | "pending";
export type ISellerPayment = "pending" | "fulfilled";

export interface IAdvertisement {
  title: string;
  image: string;
  dos: Date;
  doe: Date;
  link: string;
  advertiserId: Types.ObjectId;
}
export interface IUnit {
  productId: Types.ObjectId;
  price: number;
  quantity: number;
  shopName: string;
}

export interface ICartOrder {
  sellerId: Types.ObjectId;
  units: IUnit[];
  amount?: number;
}

export interface ICart {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  status: "active" | "settled";
  orders: ICartOrder[];
  units: IUnit[];
  totalAmount: number;
  totalQuantity: number;
  paypalOrderId: string;
  transactionIds: Types.ObjectId[];
}

export interface ICategory {
  _id: string;
  name: string;
  parentId: string | null;
  path: string[];
  level: number;
  children?: ICategory[];
}

export interface IChat {
  seller_id: Object;
  participants: Object[];
}

export interface IMessage {
  chat_id: Object;
  buyer_id: Object;
  seller_id: Object;
  message: string;
  is_read: boolean;
}

export interface IOrder {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  sellerId: Types.ObjectId;
  productId: Types.ObjectId;
  amount: number;
  quantity: number;
  shopName: string;
  deliveryStatus: "pending" | "shipped" | "delivered" | "cancelled";
  paymentMethod: "cash" | "upi" | "paypal";
  paymentStatus: "pending" | "paid";
  transactionId?: Types.ObjectId;
  cartId?: Types.ObjectId;
}

export interface IProduct {
  name: string;
  category: string[];
  sellerId: Types.ObjectId;
  shopName: string;
  description: string;
  brand: string;
  media: IMedia[];
  price: number;
  sales: number;
  stock: number;
  rating: number;
  discount: number;
}
export interface IMedia {
  type: "image" | "video";
  url: string;
  publicId: string;
}

export interface ITransaction {
  _id?: Types.ObjectId;
  clientId: Types.ObjectId;
  sellerId: Types.ObjectId;
  cartId: Types.ObjectId;
  orderIds: Types.ObjectId[];
  paymentMethod: "cash" | "paypal" | "upi";
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  paymentDetails?: any;
  transactionId?: string;
  paypalOrderId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface IAddress {
  _id?: Types.ObjectId;
  lng: number;
  lat: number;
  street: string;
  city: string;
  phone: string;
  province: string;
}
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  businessName: string;
  media: string;
  email: string;
  password: string;
  description: string;
  boarded: boolean;
  sellerStatus: ISellerStatus;
  paymentStatus: ISellerPayment;
  roles: Role[];
  method: "standard" | "google";
  refreshToken?: string;
  googleId?: string;
  addresses: IAddress[];
  businessAddresses: IAddress[];
  createdAt?: Date;
  updatedAt?: Date;
  emailOtp?: string;
  emailOtpExpiresAt?: Date;
}

export interface IWishList {
  userId: Types.ObjectId;
  products: Types.ObjectId[];
}
