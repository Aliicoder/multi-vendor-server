import { getPaginatedOrdersDB } from "../services/orderServices";
import { IGetPaginatedOrdersParams } from "../types/params";
import { CatchAsyncError } from "../utils/catchAsync";
import { ExtendRequest } from "../types/custom";
import { Response } from "express";

export const getPaginatedOrders = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const {
      _id,
      userId,
      curPage = 1,
      perPage = 10,
      sort,
    } = req.query as unknown as IGetPaginatedOrdersParams;
    const excludeFields = ["curPage", "perPage", "sort", "userId"];
    let query = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !excludeFields.includes(key))
    ) as any;
    query = JSON.stringify(query).replace(
      /\bgte|gt|lte|lt\b/g,
      (match) => `$${match}`
    );
    query = JSON.parse(query);
    const result = await getPaginatedOrdersDB({
      _id,
      curPage: Number(curPage),
      perPage: Number(perPage),
      sort,
      query,
    });
    return res.status(result.statusCode).json({
      success: true,
      orders: result.orders,
      message: result.message,
      pagesLen: result.pagesLen,
      maxAmount: result.maxAmount,
      maxQuantity: result.maxQuantity,
    });
  }
);
