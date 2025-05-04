import { Response } from "express";
import { CatchAsyncError } from "../utils/catchAsync";
import ApiError from "../utils/apiError";
import {
  getWishListDB,
  addProductToWishListDB,
  deleteProductFromWishListDB,
} from "../services/wishListServices";
import {
  IAddProductToWishListParams,
  IDeleteProductFromWishListParams,
} from "../types/params";
import { ExtendRequest } from "../types/custom";

export const getWishList = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const userId = req.user._id;
    const result = await getWishListDB({ userId });

    if (!result.success) throw new ApiError(result.message, result.statusCode);

    res.status(200).json({
      success: true,
      wishList: result.wishList,
      message: result.message,
    });
  }
);

export const addProductToWishList = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const userId = req.user._id;
    const { productId } = req.params as unknown as IAddProductToWishListParams;

    if (!productId) throw new ApiError("Product ID is required", 400);

    const result = await addProductToWishListDB({ userId, productId });

    if (!result.success) throw new ApiError(result.message, result.statusCode);

    res.status(200).json({
      success: true,
      data: result.wishList,
      message: result.message,
    });
  }
);

export const deleteProductFromWishList = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const userId = req.user._id;
    const { productId } =
      req.params as unknown as IDeleteProductFromWishListParams;

    if (!productId) throw new ApiError("Product ID is required", 400);

    const result = await deleteProductFromWishListDB({ userId, productId });

    if (!result.success) throw new ApiError(result.message, result.statusCode);

    res.status(200).json({
      success: true,
      data: result.wishList,
      message: result.message,
    });
  }
);
