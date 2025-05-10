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
      name,
    } = req.query as unknown as IFetchProductsParams;
    const excludeFields = ["sort", "name", "curPage", "perPage", "category"];
    let query = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !excludeFields.includes(key))
    ) as any;
    query = JSON.stringify(query).replace(
      /\bgte|gt|lte|lt\b/g,
      (match) => `$${match}`
    );

    query = JSON.parse(query);
    if (name) query.name = { $regex: name, $options: "i" };

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
      maxPrice: result.maxPrice,
      maxStock: result.maxStock,
      maxSales: result.maxSales,
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
      data: result.product,
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
    const { prompt, curPage = 1, perPage = 5, outOfStock = false } = req.body;

    if (!prompt || typeof prompt !== "string")
      throw new ApiError("Search query is required", 400);

    const result = await getAISearchedProductsDB({
      prompt,
      curPage,
      perPage,
      outOfStock,
    });
    return res.status(200).json({
      success: true,
      products: result.data,
      message: result.message,
    });
  }
);

export const addProduct = CatchAsyncError(
  async (req: ExtendRequest, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const { files, body } = req;
    console.log("body : ", body);

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

    const media = files?.media
      ? Array.isArray(files.media)
        ? files.media
        : [files.media]
      : [];

    const productData = {
      sellerId: userId,
      name: body.name as string,
      description: body.description as string,
      category: body.category as string,
      brand: body.brand as string,
      stock: Number(body.stock),
      price: Number(body.price),
      discount: Number(body.discount) || 0,
      media,
    };

    const result = await addProductDB(productData);

    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      product: result.data,
    });
  }
);

export const updateProduct = CatchAsyncError(
  async (req: ExtendRequest, res: Response, next: NextFunction) => {
    req.body.productId = req.params.productId;
    req.body.sellerId = req.user._id;
    const { files, body } = req;

    const requiredFields = [
      "productId",
      "sellerId",
      "name",
      "description",
      "brand",
      "discount",
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
    const media = files?.media
      ? Array.isArray(files.media)
        ? files.media
        : [files.media]
      : [];
    const deletedMedia = body.deletedMedia
      ? Array.isArray(body.deletedMedia)
        ? body.deletedMedia
        : [body.deletedMedia]
      : [];

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
      media,
      deletedMedia,
    };

    const result = await updateProductDB(productData);
    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      product: result.data,
    });
  }
);
