import { Response } from "express-serve-static-core";
import {
  addProductDB,
  getAISearchedProductsDB,
  getPaginatedProductsDB,
  getProductDB,
  getSearchedProductsDB,
  updateProductDB,
} from "../services/productServices";
import { CatchAsyncError } from "../utils/catchAsync";
import { NextFunction } from "express";
import ApiError from "../utils/apiError";
import { UploadedFile } from "express-fileupload";
import { IFetchProductsParams } from "../types/params";
import Category from "../models/Category";
import { ExtendRequest } from "../types/custom";

export const getPaginatedProducts = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const {
      curPage = 1,
      perPage = 5,
      category,
      sort,
    } = req.query as unknown as IFetchProductsParams;
    const excludeFields = ["sort", "name", "curPage", "perPage", "category"];
    let query = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !excludeFields.includes(key))
    ) as any;

    if (query.name) query.name = { $regex: new RegExp(query.name as string) };

    if (category) {
      const path = await Category.findOne({ name: category }).then(
        (category) => category?.path
      );
      query.category = { $in: path };
    }
    const params = {
      perPage: Number(perPage),
      curPage: Number(curPage),
      sort,
      query,
    };

    const result = await getPaginatedProductsDB(params);

    return res.status(result.statusCode).json({
      success: true,
      products: result.products,
      pagesLen: result.pagesLen,
      message: result.message,
    });
  }
);

export const getProduct = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const { productId } = req.params;
    const result = await getProductDB(productId);
    return res.status(result.statusCode).json({
      success: true,
      product: result.product,
      message: result.message,
    });
  }
);

export const getSearchedProducts = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const { name } = req.query;

    if (!name || typeof name !== "string")
      throw new ApiError("Search query is required", 400);

    const result = await getSearchedProductsDB({ name });
    return res.status(200).json({
      success: true,
      suggestions: result.suggestions,
    });
  }
);

export const getAISearchedProducts = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string")
      throw new ApiError("Search query is required", 400);

    const result = await getAISearchedProductsDB({ prompt });
    return res.status(200).json({
      success: true,
      products: result.products,
      message: result.message,
    });
  }
);

export const addProduct = CatchAsyncError(
  async (req: ExtendRequest, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { files, body } = req;
    const media = files?.media as UploadedFile[];

    const requiredFields = [
      "name",
      "description",
      "brand",
      "stock",
      "price",
      "category",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);
    if (missingFields.length > 0) {
      return next(
        new ApiError(
          `Missing required fields: ${missingFields.join(", ")}`,
          400
        )
      );
    }

    if (!files || !files.media)
      throw new ApiError("Product media is required", 400);

    const mediaFiles = Array.isArray(media) ? media : [media];

    const productData = {
      sellerId: userId,
      name: body.name as string,
      description: body.description as string,
      category: body.category as string,
      brand: body.brand as string,
      stock: Number(body.stock),
      price: Number(body.price),
      discount: Number(body.discount) || 0,
      media: mediaFiles,
    };

    const result = await addProductDB(productData);

    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
    });
  }
);

export const updateProduct = CatchAsyncError(
  async (req: ExtendRequest, res: Response, next: NextFunction) => {
    req.body.productId = req.params.productId;
    req.body.sellerId = req.user._id;
    const { files, body } = req;
    let media = (files?.media as UploadedFile[]) || [];

    const requiredFields = [
      "productId",
      "sellerId",
      "name",
      "description",
      "brand",
      "discount",
      "deletedMedia",
      "stock",
      "price",
      "category",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);
    if (missingFields.length > 0) {
      return next(
        new ApiError(
          `Missing required fields: ${missingFields.join(", ")}`,
          400
        )
      );
    }

    const mediaFiles = Array.isArray(media) ? media : [media];

    const productData = {
      productId: body.productId,
      sellerId: body.sellerId,
      name: body.name as string,
      description: body.description as string,
      category: body.category as string,
      brand: body.brand as string,
      stock: Number(body.stock),
      price: Number(body.price),
      discount: Number(body.discount) || 0,
      media: mediaFiles,
      deletedMedia: JSON.parse(body.deletedMedia) as string[],
    };

    const result = await updateProductDB(productData);

    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
    });
  }
);
