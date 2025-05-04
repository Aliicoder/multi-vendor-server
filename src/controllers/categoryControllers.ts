import {
  createCategoryDB,
  getCategoriesDB,
  getPaginatedCategoriesDB,
} from "../services/categoryServices";
import { Response } from "express-serve-static-core";
import { CatchAsyncError } from "../utils/catchAsync";
import { NextFunction } from "express";
import ApiError from "../utils/apiError";
import {
  ICreateCategoryParams,
  IGetPaginatedCategoriesParams,
} from "../types/params";
import { ExtendRequest } from "../types/custom";
export const createCategory = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const { name, parentId } = req.body as ICreateCategoryParams;
    const result = await createCategoryDB({ name, parentId });
    if (!result.success) throw new ApiError(result.message, result.statusCode);
    res.status(result.statusCode).json({
      success: true,
      category: result.category,
      message: result.message,
    });
  }
);

export const getCategories = CatchAsyncError(
  async (req: Request, res: Response) => {
    const result = await getCategoriesDB();

    if (!result.success) throw new ApiError(result.message, result.statusCode);

    res.status(result.statusCode).json({
      success: true,
      categories: result.categories,
      message: result.message,
    });
  }
);

export const getPaginatedCategories = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const {
      name,
      perPage = 10,
      curPage = 1,
      sort,
      category,
    } = req.query as unknown as IGetPaginatedCategoriesParams;
    const excludeFields = ["name", "perPage", "curPage", "sort"];
    const query = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !excludeFields.includes(key))
    );

    if (name) query.name = { $regex: name, $options: "i" };

    const result = await getPaginatedCategoriesDB({
      query,
      perPage,
      curPage,
      sort,
      category,
    });

    if (!result.success) throw new ApiError(result.message, result.statusCode);
    res.status(result.statusCode).json({
      success: true,
      categories: result.categories,
      message: result.message,
    });
  }
);
