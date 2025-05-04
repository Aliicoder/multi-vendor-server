import { getPaginatedOrdersDB } from "../services/orderServices";
import { IGetPaginatedOrdersParams } from "../types/params";
import { CatchAsyncError } from "../utils/catchAsync";
import { ExtendRequest } from "../types/custom";
import { Response } from "express";

export const getPaginatedOrders = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const {
      page = 1,
      limit = 10,
      sort,
    } = req.query as unknown as IGetPaginatedOrdersParams;
    const excludeFields = ["page", "limit", "sort"];
    let query = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !excludeFields.includes(key))
    ) as any;
    console.log(query, page, limit, sort);
    const result = await getPaginatedOrdersDB({
      page: Number(page),
      limit: Number(limit),
      sort,
      query,
    });
    return res.status(result.statusCode).json({
      success: true,
      orders: result.orders,
      message: result.message,
    });
  }
);
