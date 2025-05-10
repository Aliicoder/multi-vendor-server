import { Transaction } from "../models/Transaction";
import { IResult } from "../types/custom";
import { IGetPaginatedOrdersParams } from "../types/params";
import { ITransaction } from "../types/schema";

export const getPaginatedTransactionsDB = async (
  params: IGetPaginatedOrdersParams
): Promise<IResult<ITransaction[]>> => {
  const { curPage, perPage, sort, query } = params;

  const skip = (curPage - 1) * perPage;
  let transactions, count;
  if (sort) {
    [transactions, count] = await Promise.all([
      Transaction.find(query).sort(sort).skip(skip).limit(perPage),
      Transaction.countDocuments(),
    ]);
  } else {
    [transactions, count] = await Promise.all([
      Transaction.find(query).skip(skip).limit(perPage),
      Transaction.countDocuments(),
    ]);
  }
  const maxAmount = await Transaction.aggregate([
    { $group: { _id: null, maxAmount: { $max: "$amount" } } },
  ]);
  const pagesLen = Math.ceil(count / perPage);
  return {
    success: true,
    transactions,
    pagesLen,
    maxAmount,
    message: "Transactions fetched successfully",
    statusCode: 200,
  };
};
