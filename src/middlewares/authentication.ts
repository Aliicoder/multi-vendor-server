import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { CatchAsyncError } from "../utils/catchAsync";
import ApiError from "../utils/apiError";
import { ExtendRequest, TokenProps } from "../types/custom";
import { config } from "../config/environment";

export const genAccessToken = ({ _id, roles }: TokenProps) => {
  const accessToken: string = jwt.sign(
    { _id, roles },
    process?.env?.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
    }
  );
  return accessToken;
};

export const genRefreshToken = ({ _id, roles }: TokenProps) => {
  const accessToken: string = jwt.sign(
    { _id, roles },
    process?.env?.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
    }
  );
  return accessToken;
};

export const authentication = CatchAsyncError(
  async (req: ExtendRequest, res: Response, next: NextFunction) => {
    const token = req.get("authorization")?.split(" ")[1];
    if (!token) {
      console.log("🛡️ Token not found ~ trying to refresh access token");
      throw new ApiError("Token is required", 403);
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as TokenProps;
      req.user = payload;
      next();
    } catch (error) {
      console.log("🛡️ Invalid token ~ trying to refresh access token");
      throw new ApiError("Invalid token", 403);
    }
  }
);
