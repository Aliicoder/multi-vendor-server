import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { IAddAddressParams, IGetPaginatedUsersParams } from "../types/params";
import { createAccessToken, createRefreshToken } from "../utils/tokenUtils";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError";
import { CatchAsyncError } from "../utils/catchAsync";
import { HydratedDocument, Types } from "mongoose";
import {
  acceptApplicantDB,
  addAddressDB,
  deleteAddressDB,
  getPaginatedUsersDB,
  rejectApplicantDB,
  setDefaultAddressDB,
  updateAddressDB,
} from "../services/userServices";
import client from "../utils/googleClient";
import { config } from "../config/environment";
import { ExtendRequest, IAuthState } from "../types/custom";
import { ISellerStatus, IUser, Role } from "../types/schema";

export const signup = CatchAsyncError(async (req: Request, res: Response) => {
  const { email, description, name, password, requestedRole } = req.body;

  const validRoles: Role[] = ["client", "seller", "courier"];
  if (!validRoles.includes(requestedRole)) {
    throw new ApiError("Invalid role request", 400);
  }

  let user = await User.findOne({ email });

  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 12);

    const userData: Partial<IUser> = {
      name,
      email,
      password: hashedPassword,
      roles: [requestedRole],
      method: "standard",
      addresses: [],
    };

    if (requestedRole === "seller") {
      userData.description = description;
      userData.sellerStatus = "pending";
      userData.businessAddresses = [];
    }

    user = await User.create(userData);
  } else {
    if (user.roles.includes(requestedRole)) {
      throw new ApiError(`You already have a ${requestedRole} account`, 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError("Invalid credentials", 401);
    }

    user.roles.push(requestedRole);

    if (requestedRole === "seller") {
      user.sellerStatus = "pending";
      user.description = description;
    }

    await user.save();
  }

  res.status(201).json({
    success: true,
    message: "signed up successfully",
  });
});

export const login = CatchAsyncError(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user: HydratedDocument<IUser> | null = await User.findOne({ email });
  console.log("user ", user);
  if (!user) {
    throw new ApiError("Invalid credentials", 400);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError("Invalid credentials", 400);
  }

  const refreshToken = createRefreshToken(user._id.toString());
  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const accessToken = createAccessToken(user._id.toString());
  const auth: IAuthState = {
    userId: user._id,
    name: user.name,
    email: user.email,
    accessToken,
    ...(user.addresses && { addresses: user.addresses }),
    ...(user.sellerStatus && { sellerStatus: user.sellerStatus }),
    roles: user.roles,
  };
  res.status(200).json({ user: auth, message: "login successful" });
});

export const refreshAccessToken = CatchAsyncError(
  async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    if (!token) {
      throw new ApiError("No refresh token provided", 401);
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as {
      _id: string;
    };

    const user: HydratedDocument<IUser> | null = await User.findById(
      decoded._id
    );
    if (!user || user.refreshToken !== token) {
      throw new ApiError("Invalid refresh token", 403);
    }

    const accessToken = createAccessToken(user._id.toString());

    const auth: IAuthState = {
      userId: user._id,
      name: user.name,
      email: user.email,
      accessToken,
      ...(user.addresses && { addresses: user.addresses }),
      ...(user.sellerStatus && { sellerStatus: user.sellerStatus }),
      roles: user.roles,
    };

    res.status(200).json({ user: auth, message: "refreshed access token" });
  }
);

export const logout = CatchAsyncError(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (token) {
    const user: HydratedDocument<IUser> | null = await User.findOne({
      refreshToken: token,
    });
    if (user) {
      user.refreshToken = "";
      await user.save();
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  console.log("logout successful");
  res.status(403).json({ message: "logout successful" });
});

export const googleLogin = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new ApiError("Invalid Google token payload", 400);
    }

    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: "",
        method: "google",
        googleId,
        roles: ["client"],
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
      }
    }

    const refreshToken = createRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const accessToken = createAccessToken(user._id.toString());

    const auth: IAuthState = {
      userId: new Types.ObjectId(user._id),
      name: user.name,
      email: user.email,
      accessToken,
      ...(user.addresses && { addresses: user.addresses }),
      roles: user.roles,
    };

    res.status(200).json({
      success: true,
      user: auth,
      message: "Login successful",
    });
  }
);

export const getPaginatedUsers = CatchAsyncError(
  async (req: ExtendRequest, res: Response) => {
    const {
      name,
      sellerStatus,
      roles,
      curPage = 1,
      perPage = 10,
      sort,
    } = req.query as unknown as IGetPaginatedUsersParams;
    const exclude = ["name", "perPage", "curPage", "sort"];
    const query = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => !exclude.includes(key))
    );

    if (name) query.name = { $regex: name, $options: "i" };

    const result = await getPaginatedUsersDB({
      name: name as string,
      sellerStatus: sellerStatus as ISellerStatus,
      roles: roles as Role[],
      curPage: Number(curPage),
      perPage: Number(perPage),
      sort: sort as string,
      query,
    });

    res.status(200).json(result);
  }
);

export const acceptApplicant = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await acceptApplicantDB(userId, "active");
    if (!result.success) {
      return res.status(result.statusCode).json({ message: result.message });
    }
    res.status(result.statusCode).json({ message: result.message, result });
  }
);

export const rejectApplicant = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await rejectApplicantDB(userId, "inactive");
    if (!result.success) {
      return res.status(result.statusCode).json({ message: result.message });
    }
    res.status(result.statusCode).json({ message: result.message, result });
  }
);

export const addAddress = CatchAsyncError(
  async (req: Request, res: Response) => {
    req.body.userId = req.params.userId;
    const { userId, province, city, street, phone, lng, lat } =
      req.body as IAddAddressParams;
    const requiredFields = [
      "province",
      "city",
      "street",
      "phone",
      "lng",
      "lat",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
        statusCode: 400,
      };
    }
    const result = await addAddressDB({
      userId,
      province,
      city,
      street,
      phone,
      lng,
      lat,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({ message: result.message });
    }

    res
      .status(result.statusCode)
      .json({ message: result.message, addresses: result.addresses });
  }
);

export const updateAddress = CatchAsyncError(
  async (req: Request, res: Response) => {
    req.body.userId = req.params.userId;
    const { userId, addressId, province, city, street, phone, lng, lat } =
      req.body;
    const requiredFields = [
      "userId",
      "addressId",
      "province",
      "city",
      "street",
      "phone",
      "lng",
      "lat",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0)
      throw new ApiError(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );

    const result = await updateAddressDB({
      userId,
      addressId,
      province,
      city,
      street,
      phone,
      lng,
      lat,
    });

    if (!result.success) throw new ApiError(result.message, result.statusCode);

    res.status(result.statusCode).json({
      success: true,
      message: result.message,
      addresses: result.addresses,
    });
  }
);

export const deleteAddress = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { userId, addressId } = req.body;
    const requiredFields = ["userId", "addressId"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0)
      throw new ApiError(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );

    const result = await deleteAddressDB({ userId, addressId });

    if (!result.success) throw new ApiError(result.message, result.statusCode);

    res.status(result.statusCode).json({
      success: true,
      message: result.message,
      addresses: result.addresses,
    });
  }
);

export const setDefaultAddress = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { userId, addressId } = req.body;
    const requiredFields = ["userId", "addressId"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0)
      throw new ApiError(
        `Missing required fields: ${missingFields.join(", ")}`,
        400
      );

    const result = await setDefaultAddressDB({ userId, addressId });

    if (!result.success) throw new ApiError(result.message, result.statusCode);

    res.status(result.statusCode).json({
      success: true,
      message: result.message,
      addresses: result.addresses,
    });
  }
);
