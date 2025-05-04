import { Types } from "mongoose";
import { Request } from "express";
import { IAddress, IMedia, Role } from "./schema";

export interface IErrorResponse {
  success: boolean;
  message: string;
  operational: boolean;
  route?: string;
  stack?: string;
  error?: Error;
}
export interface TokenProps {
  _id: string;
  roles: string[];
}

export interface IAuthState {
  userId: Types.ObjectId;
  name: string;
  media?: IMedia;
  email?: string;
  accessToken: string;
  addresses?: IAddress[];
  roles: Role[];
}

export interface ExtendRequest extends Request {
  user: TokenProps;
}
