import { Order } from "../models/Order";
import { IGetPaginatedOrdersParams } from "../types/params";

export const getPaginatedOrdersDB = async (
  params: IGetPaginatedOrdersParams
): Promise<any> => {
  const { curPage, perPage, sort, query } = params;

  const skip = (curPage - 1) * perPage;
  const [orders, count, maxAmount, maxQuantity] = await Promise.all([
    sort
      ? Order.find(query)
          .sort(sort)
          .skip(skip)
          .limit(perPage)
          .populate("productId")
      : Order.find(query).skip(skip).limit(perPage).populate("productId"),
    Order.countDocuments(query),
    Order.aggregate([
      { $group: { _id: null, maxAmount: { $max: "$amount" } } },
    ]),
    Order.aggregate([
      { $group: { _id: null, maxQuantity: { $max: "$quantity" } } },
    ]),
  ]);
  const pagesLen = Math.ceil(count / perPage);
  return {
    success: true,
    orders,
    maxAmount: maxAmount[0].maxAmount,
    maxQuantity: maxQuantity[0].maxQuantity,
    pagesLen,
    message: "Orders fetched successfully",
    statusCode: 200,
  };
};
