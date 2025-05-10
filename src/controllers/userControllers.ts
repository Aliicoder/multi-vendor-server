import { Request, Response } from "express";
import { User } from "../models/User";
import {
  IAddAddressParams,
  IGetPaginatedUsersParams,
  IOnboardingParams,
} from "../types/params";
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
  onboardingDB,
  rejectApplicantDB,
  setDefaultAddressDB,
  signup,
  updateAddressDB,
} from "../services/userServices";
import client from "../utils/googleClient";
import { config } from "../config/environment";
import { ExtendRequest, IAuthState } from "../types/custom";
import { ISellerStatus, IUser, Role } from "../types/schema";
import twilioClient from "../utils/twilioUtils";
import { generateOTP, sendOTPEmail } from "../utils/sendGridUtils";
import { redisClient } from "../utils/redisClient";
import { loginDB } from "../services/userServices";

export const login = CatchAsyncError(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await loginDB({ email, password });
  console.log("login result ", result);
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res
    .status(result.statusCode)
    .json({ user: result.user, message: result.message });
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
        user.method = "google";
      }
    }

    const refreshToken = createRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const accessToken = createAccessToken(user._id.toString());

    const auth: IAuthState = {
      userId: new Types.ObjectId(user._id),
      name: user.name,
      email: user.email,
      accessToken,
      ...(user.addresses && { addresses: user.addresses }),
      ...(user.sellerStatus && { sellerStatus: user.sellerStatus }),
      roles: user.roles,
      boarded: user.boarded,
    };

    res.status(200).json({
      success: true,
      user: auth,
      message: "Login successful",
    });
  }
);

export const onboarding = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params as unknown as IOnboardingParams;
    const { businessName, description } = req.body as IOnboardingParams;
    const result = await onboardingDB({ userId, businessName, description });
    res
      .status(result.statusCode)
      .json({ user: result.user, message: result.message });
  }
);

export const refreshAccessToken = CatchAsyncError(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    console.log("refreshToken ", refreshToken);
    if (!refreshToken) {
      console.log("🛡️ No refresh token provided ~ logging out");
      throw new ApiError("No refresh token provided", 403);
    }
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as {
      _id: string;
    };

    const user: HydratedDocument<IUser> | null = await User.findById(
      decoded._id
    );
    if (!user || user.refreshToken !== refreshToken) {
      console.log("🛡️ Invalid refresh token ~ logging out");
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
      boarded: user.boarded,
    };
    res.status(200).json({ user: auth, message: "refreshed access token" });
  }
);

export const logout = CatchAsyncError(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const user: HydratedDocument<IUser> | null = await User.findOne({
      refreshToken,
    });
    if (user) {
      user.refreshToken = "";
      await user.save();
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  console.log("🛡️ logging out");

  res.status(401).json({ message: "logout successful" });
});

export const sendMobileOtp = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { phone } = req.body;

    if (!phone) {
      return res
        .status(422)
        .json({ success: false, message: "Phone number is required" });
    }
    const verification = await twilioClient.verify.v2
      .services(config.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      verificationSid: verification.sid,
    });
  }
);

export const verifyMobileOtp = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(422).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    const verificationCheck = await twilioClient.verify.v2
      .services(config.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code: otp });

    if (verificationCheck.status === "approved") {
      res.status(200).json({
        success: true,
        message: "Phone number verified successfully!",
        verificationCheck,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
        status: verificationCheck.status,
      });
    }
  }
);

export const sendEmailOtp = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) throw new ApiError("Email is required", 422);
    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    await redisClient.set(`email-otp-${email}`, otp, { EX: 10 * 60 });
    res.status(200).json({ message: "OTP sent successfully" });
  }
);

export const verifyEmailOtp = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { email, otp, name, password, requestedRole } = req.body;
    if (!email || !otp) throw new ApiError("Email and OTP are required", 422);
    const storedOtp = await redisClient.get(`email-otp-${email}`);

    if (!storedOtp) throw new ApiError("OTP expired. Please try again.", 400);
    if (otp !== storedOtp)
      throw new ApiError("Invalid OTP. Please try again.", 400);

    await redisClient.del(`email-otp-${email}`);
    const result = await signup({ email, name, password, requestedRole });
    res
      .status(result.statusCode)
      .json({ message: result.message, success: result.success });
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

    res.status(result.statusCode).json({ message: result.message, result });
  }
);

export const rejectApplicant = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await rejectApplicantDB(userId, "inactive");
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

    res.status(result.statusCode).json({
      success: true,
      message: result.message,
      addresses: result.addresses,
    });
  }
);
