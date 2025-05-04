import Category from "../models/Category";
import {
  ICreateCategoryParams,
  IGetPaginatedCategoriesParams,
} from "../types/params";
import { HydratedDocument } from "mongoose";
import ApiError from "../utils/apiError";
import { ICategory } from "../types/schema";

export const getCategoriesDB = async (): Promise<any> => {
  try {
    const categories = await Category.find({ level: 1 })
      .sort({ name: 1 })
      .populate({
        path: "children",
        populate: {
          path: "children",
          populate: {
            path: "children",
          },
        },
      });

    if (categories.length === 0) throw new ApiError("No categories found", 404);

    return {
      success: true,
      categories,
      statusCode: 200,
      message: "categories fetched successfully",
    };
  } catch (error: any) {
    throw new ApiError(error.message || "Failed to fetch categories", 500);
  }
};

export const createCategoryDB = async (
  params: ICreateCategoryParams
): Promise<any> => {
  try {
    const { name, parentId } = params;
    const existingCategory: HydratedDocument<ICategory> | null =
      await Category.findOne({ name });
    if (existingCategory)
      throw new ApiError("Category with this name already exists", 409);

    let level = 1;
    let path: string[] = [name];

    if (parentId) {
      const parentCategory: HydratedDocument<ICategory> | null =
        await Category.findById(parentId);
      if (!parentCategory) throw new ApiError("Parent category not found", 404);
      level = parentCategory.level + 1;
      path = [...parentCategory.path, name];
    }

    const category: HydratedDocument<ICategory> | null = await Category.create({
      name,
      parentId: parentId || null,
      path,
      level,
    });
    return {
      success: true,
      data: category,
      message: "Category created successfully",
      statusCode: 201,
    };
  } catch (error: any) {
    throw new ApiError(error.message || "Failed to create category", 500);
  }
};
export const getPaginatedCategoriesDB = async (
  params: IGetPaginatedCategoriesParams
): Promise<any> => {
  try {
    const { perPage = 10, curPage = 1, query } = params;

    const total = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .skip((curPage - 1) * perPage)
      .limit(perPage);

    if (categories.length === 0) throw new ApiError("No categories found", 404);

    const result = {
      categories,
      currentPage: curPage,
      perPage,
      totalPages: Math.ceil(total / perPage),
      totalItems: total,
    };

    return {
      success: true,
      categories: result.categories,
      statusCode: 200,
      message: "Categories fetched successfully",
    };
  } catch (error: any) {
    throw new ApiError(error.message || "Failed to fetch categories", 500);
  }
};
