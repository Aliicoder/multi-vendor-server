import { NextFunction, Response } from "express-serve-static-core";
import {
  addProductToCartDB,
  cashCheckoutDB,
  deleteProductFromCartDB,
  getUserPopulatedActiveCartDB,
  paypalCaptureOrderDB,
  paypalCreateOrderDB,
} from "../services/cartServices";
import { CatchAsyncError } from "../utils/catchAsync";
import {
  IAddProductToCartParams,
  IDeleteProductFromCartParams,
} from "../types/params";
import { ExtendRequest } from "../types/custom";
export const getUserActiveCart = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const userId = req.user._id;
    const result = await getUserPopulatedActiveCartDB({
      userId,
    });
    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      cart: result.cart,
    });
  }
);

export const addProductToCart = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const userId = req.user._id;
    const { productId } = req.body as IAddProductToCartParams;
    const result = await addProductToCartDB({
      userId,
      productId,
    });
    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      cart: result.cart,
    });
  }
);

export const deleteProductFromCart = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const userId = req.user._id;
    const { productId } = req.body as IDeleteProductFromCartParams;
    const result = await deleteProductFromCartDB({
      userId,
      productId,
    });
    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      cart: result.cart,
    });
  }
);

export const cashCheckout = CatchAsyncError(
  async (req: ExtendRequest, res: Response, _next: NextFunction) => {
    const userId = req.user._id;
    const result = await cashCheckoutDB({
      userId,
    });
    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
    });
  }
);

export const paypalCreateOrder = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const result = await paypalCreateOrderDB({
      userId: req.user._id,
    });

    return res.status(result.statusCode).json({
      success: true,
      orderId: result.orderId,
      message: result.message,
    });
  }
);

export const paypalCaptureOrder = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const { orderId } = req.body;
    const result = await paypalCaptureOrderDB({
      userId: req.user._id,
      orderId,
    });
    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
    });
  }
);
