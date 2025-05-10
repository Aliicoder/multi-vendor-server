import { getPaginatedTransactionsDB } from "../services/transactionServices";
import { IGetPaginatedOrdersParams } from "../types/params";
import { CatchAsyncError } from "../utils/catchAsync";
import { ExtendRequest } from "../types/custom";
import { Response } from "express";

export const getPaginatedTransactions = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const {
      _id,
      curPage = 1,
      perPage = 10,
      sort,
    } = req.query as unknown as IGetPaginatedOrdersParams;
    const excludeFields = ["curPage", "perPage", "sort", "_id"];
    let query = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !excludeFields.includes(key))
    ) as any;
    query = JSON.stringify(query).replace(
      /\bgte|gt|lte|lt\b/g,
      (match) => `$${match}`
    );
    query = JSON.parse(query);
    console.log("query", query);
    const result = await getPaginatedTransactionsDB({
      _id,
      curPage: Number(curPage),
      perPage: Number(perPage),
      sort,
      query,
    });
    return res.status(result.statusCode).json({
      success: true,
      transactions: result.transactions,
      message: result.message,
      pagesLen: result.pagesLen,
      maxAmount: result.maxAmount,
    });
  }
);
