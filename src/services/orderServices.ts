import { Order } from "../models/Order";
import { IGetPaginatedOrdersParams } from "../types/params";

export const getPaginatedOrdersDB = async (
  params: IGetPaginatedOrdersParams
): Promise<any> => {
  const { page, limit, sort, query } = params;
  const skip = (page - 1) * limit;
  let orders, count;
  if (sort) {
    [orders, count] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("productId"),
      Order.countDocuments(query),
    ]);
  } else {
    [orders, count] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).populate("productId"),
      Order.countDocuments(query),
    ]);
  }
  const pagesLen = Math.ceil(count / limit);
  return {
    success: true,
    orders,
    pagesLen,
    message: "Orders fetched successfully",
    statusCode: 200,
  };
};
