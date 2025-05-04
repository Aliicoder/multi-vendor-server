import { Types } from "mongoose";
import Product from "../models/Product";
import WishList from "../models/whishList";
import {
  IAddProductToWishListParams,
  IDeleteProductFromWishListParams,
  IGetWishListParams,
} from "../types/params";
import ApiError from "../utils/apiError";

export const getWishListDB = async (
  params: IGetWishListParams
): Promise<any> => {
  const { userId } = params;
  let wishList;
  wishList = await WishList.findOne({ userId }).populate({
    path: "products",
    model: Product,
  });
  if (!wishList) {
    wishList = await WishList.create({ userId });
    if (!wishList) throw new ApiError("Failed to create wishList", 500);
    return {
      success: true,
      statusCode: 201,
      wishList,
      message: "wishList created successfully",
    };
  }
  return {
    success: true,
    statusCode: 200,
    wishList,
    message: "wishList fetched successfully",
  };
};

export const addProductToWishListDB = async (
  params: IAddProductToWishListParams
): Promise<any> => {
  const { userId, productId } = params;
  const product = await Product.findById({ _id: productId });
  if (!product) throw new ApiError("Product not found", 404);
  const wishList = await WishList.findOne({ userId });
  const isProductInWishList = wishList.products.includes(productId);
  if (isProductInWishList)
    throw new ApiError("Product already in wishList", 403);
  wishList.products.push(productId);
  await wishList.save();
  return { success: true, statusCode: 200, message: "product tagged" };
};

export const deleteProductFromWishListDB = async (
  params: IDeleteProductFromWishListParams
): Promise<any> => {
  const { userId, productId } = params;
  const product = await Product.findById({ _id: productId });
  if (!product) throw new ApiError("Product not found", 404);
  const wishList = await WishList.findOne({ userId });
  const filteredProducts = wishList.products.filter(
    (wishListProductId: Types.ObjectId) =>
      wishListProductId.toString() != productId
  );
  wishList.products = filteredProducts;
  await wishList.save();
  return { success: true, statusCode: 200, message: "product untagged" };
};
