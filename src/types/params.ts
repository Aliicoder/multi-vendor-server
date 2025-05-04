import { UploadedFile } from "express-fileupload";
import { Types } from "mongoose";
import { ISellerStatus, Role } from "./schema";

export interface IFetchProductsParams {
  perPage: number;
  curPage: number;
  sort: string;
  query: {};
  category?: string;
}

export interface IAddProductParams {
  sellerId: string;
  name: string;
  description: string;
  brand: string;
  stock: number;
  price: number;
  discount?: number;
  category: string;
  media: UploadedFile[];
}

export interface IUpdateProductParams {
  productId: string;
  sellerId: string;
  name: string;
  description: string;
  brand: string;
  stock: number;
  price: number;
  discount?: number;
  category: string;
  deletedMedia?: string[];
  media: UploadedFile[];
}

export interface ICreateCategoryParams {
  name: string;
  parentId: string | null;
}
export interface IGetPaginatedCategoriesParams {
  name?: string;
  level?: number;
  perPage?: number;
  curPage?: number;
  sort?: string;
  category?: string;
  query: any;
}

export interface IGetPaginatedUsersParams {
  name: string;
  sellerStatus: ISellerStatus;
  roles: Role[];
  curPage: number;
  perPage: number;
  sort: string;
  query: any;
}

export interface IGetSearchedProductsParams {
  name: string;
}
export interface IGetAISearchedProductsParams {
  prompt: string;
}

export interface IGetActiveCartParams {
  userId: string;
}

export interface IDeleteProductFromCartParams {
  userId: string;
  productId: string;
}

export interface IAddProductToCartParams {
  userId: string;
  productId: string;
}

export interface IAddAddressParams {
  userId: string;
  province: string;
  city: string;
  street: string;
  phone: string;
  lng: number;
  lat: number;
}

export interface IUpdateAddressParams {
  userId: string;
  addressId: string;
  province: string;
  city: string;
  street: string;
  phone: string;
  lng: number;
  lat: number;
}
export interface IDeleteAddressParams {
  userId: string;
  addressId: string;
}

export interface ICheckoutParams {
  userId: string;
}

export interface IGetPaginatedOrdersParams {
  page: number;
  limit: number;
  sort: string;
  query: any;
}

export interface IGetUserOrdersParams {
  userId: string;
}

export interface IDeleteProductFromWishListParams {
  userId: string;
  productId: string;
}
export interface IAddProductToWishListParams {
  userId: string;
  productId: string;
}

export interface IGetWishListParams {
  userId: string;
}

export interface IPaypalCaptureOrderParams {
  userId: string;
  orderId: string;
}
export interface IPaypalCreateOrderParams {
  userId: string;
}
