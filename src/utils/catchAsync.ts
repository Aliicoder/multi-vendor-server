import { NextFunction, Request, Response } from "express";
import ApiError from "./apiError";
import { config } from "../config/environment";
import { IErrorResponse } from "../types/custom";

export const CatchAsyncError =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const route = req.route?.path || req.path;
  const error: IErrorResponse = {
    success: false,
    message: err.message || "Internal server error",
    operational: err instanceof ApiError,
    route,
    ...(config.NODE_ENV === "development" && { stack: err.stack }),
    ...(config.NODE_ENV === "development" && { error: err }),
  };

  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  return res.status(statusCode).json(error);
};
