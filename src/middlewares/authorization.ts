import { NextFunction } from "express";
import { ExtendRequest } from "../types/custom";
import { CatchAsyncError } from "../utils/catchAsync";
import ApiError from "../utils/apiError";
import { Role } from "../types/schema";

export const authorization = (allowedRoles: Role[]) => {
  return CatchAsyncError(
    async (req: ExtendRequest, res: Response, next: NextFunction) => {
      const { roles } = req.user;
      if (!allowedRoles.some((role) => roles.includes(role))) {
        throw new ApiError("authorization : Unauthorized", 403);
      }
      next();
    }
  );
};
