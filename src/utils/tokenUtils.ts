import jwt from "jsonwebtoken";
import { config } from "../config/environment";

export const createAccessToken = (userId: string) => {
  return jwt.sign({ _id: userId }, config.ACCESS_TOKEN_SECRET, {
    expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
  });
};

export const createRefreshToken = (userId: string) => {
  return jwt.sign({ _id: userId }, config.REFRESH_TOKEN_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
  });
};
