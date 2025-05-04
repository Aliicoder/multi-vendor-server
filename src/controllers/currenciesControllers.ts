import { Request, Response } from "express";
import { CatchAsyncError } from "../utils/catchAsync";

const CURRENCIES = [
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    changeCode: "USDUSD",
  },
  {
    code: "NRI",
    symbol: "₹",
    name: "Indian Rupee",
    changeCode: "USDNRI",
  },
  {
    code: "SAR",
    symbol: "﷼",
    name: "Saudi Riyal",
    changeCode: "USDSAR",
  },
];

const STATIC_EXCHANGE_RATES = {
  USDUSD: 1,
  USDNRI: 83.2,
  USDSAR: 3.75,
};

export const getCurrencies = CatchAsyncError(
  async (req: Request, res: Response) => {
    return res.status(200).json(CURRENCIES);
  }
);

export const getExchangeRates = CatchAsyncError(
  async (req: Request, res: Response) => {
    return res.status(200).json(STATIC_EXCHANGE_RATES);
  }
);
