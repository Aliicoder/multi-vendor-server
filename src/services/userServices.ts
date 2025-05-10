import { User } from "../models/User";
import { IAuthState, IResult } from "../types/custom";
import bcrypt from "bcrypt";
import {
  IAddAddressParams,
  IDeleteAddressParams,
  IGetPaginatedUsersParams,
  IOnboardingParams,
  ISetDefaultAddressParams,
  ISignupParams,
  IUpdateAddressParams,
} from "../types/params";
import { IAddress, ISellerStatus, IUser, Role } from "../types/schema";
import ApiError from "../utils/apiError";
import { createAccessToken, createRefreshToken } from "../utils/tokenUtils";
import { HydratedDocument } from "mongoose";

export const loginDB = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<IResult<IAuthState>> => {
  const user: HydratedDocument<IUser> | null = await User.findOne({ email });
  if (!user) throw new ApiError("Invalid credentials", 400);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError("Invalid credentials", 400);

  const refreshToken = createRefreshToken(user._id.toString());
  user.refreshToken = refreshToken;
  user.method = "standard";
  await user.save();

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
  return {
    success: true,
    user: auth,
    message: "login successful",
    statusCode: 200,
    refreshToken,
  };
};

export const signup = async ({
  email,
  name,
  password,
  requestedRole,
}: ISignupParams): Promise<IResult<void>> => {
  const validRoles: Role[] = ["client", "seller", "courier"];
  if (!validRoles.includes(requestedRole))
    throw new ApiError("Invalid role request", 400);

  let user = await User.findOne({ email });

  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 12);

    const userData: Partial<IUser> = {
      name,
      email,
      password: hashedPassword,
      roles: [requestedRole],
    };

    user = await User.create(userData);
  } else {
    if (user.roles.includes(requestedRole))
      throw new ApiError(`You already have a ${requestedRole} account`, 400);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new ApiError("Invalid credentials", 401);

    user.roles.push(requestedRole);

    await user.save();
  }

  return {
    success: true,
    message: "User signed up successfully",
    statusCode: 201,
  };
};

export const onboardingDB = async (
  params: IOnboardingParams
): Promise<IResult<IUser>> => {
  const { userId, businessName, description } = params;

  const user = await User.findOne({ _id: userId, roles: "seller" });

  if (!user) throw new ApiError("User not found", 404);

  user.businessName = businessName;
  user.description = description;
  user.boarded = true;
  user.sellerStatus = "pending";
  user.paymentStatus = "pending";

  await user.save();

  const auth: IAuthState = {
    userId: user._id,
    name: user.name,
    email: user.email,
    ...(user.addresses && { addresses: user.addresses }),
    ...(user.sellerStatus && { sellerStatus: user.sellerStatus }),
    roles: user.roles,
    boarded: user.boarded,
  };

  return {
    success: true,
    user: auth,
    message: "User onboarding successful",
    statusCode: 201,
  };
};

export const getPaginatedUsersDB = async (
  params: IGetPaginatedUsersParams
): Promise<any> => {
  try {
    const { curPage = 1, perPage = 10, sort, query } = params;
    const skip = (curPage - 1) * perPage;
    let users, total;
    if (sort) {
      [users, total] = await Promise.all([
        User.find(query).sort(sort).skip(skip).limit(perPage),
        User.countDocuments(query),
      ]);
    } else {
      [users, total] = await Promise.all([
        User.find(query).skip(skip).limit(perPage),
        User.countDocuments(query),
      ]);
    }

    return {
      sellers: users,
      total,
      page: curPage,
      perPage,
      pagesLen: Math.ceil(total / perPage),
      statusCode: 200,
      message: "Users fetched successfully",
    };
  } catch (error: any) {
    throw new ApiError(error.message ?? "Failed to fetch users", 500);
  }
};
export const acceptApplicantDB = async (
  userId: string,
  status: ISellerStatus
): Promise<any> => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { sellerStatus: status },
      { new: true }
    );

    if (!updatedUser) throw new ApiError("User not found", 404);
    return {
      success: true,
      message: "User status updated successfully",
      user: updatedUser,
      statusCode: 201,
    };
  } catch (error: any) {
    throw new ApiError(error.message ?? "Failed to update user status", 500);
  }
};

export const rejectApplicantDB = async (
  userId: string,
  status: ISellerStatus
): Promise<any> => {
  try {
    const user = await User.findById(userId);

    if (!user) throw new ApiError("User not found", 404);
    const update: any = {
      sellerStatus: status,
      $pull: { roles: "seller" },
    };

    if (user.roles.length <= 1) {
      update.$addToSet = { roles: "client" };
    }

    update.businessAddresses = [];
    update.description = "";

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
    });

    return {
      success: true,
      message: "User reverted to client successfully",
      user: updatedUser,
      statusCode: 201,
    };
  } catch (error: any) {
    throw new ApiError(error.message ?? "Failed to reject applicant", 500);
  }
};

export const addAddressDB = async (
  params: IAddAddressParams
): Promise<IResult<IAddress[]>> => {
  const { userId, province, city, street, phone, lng, lat } = params;
  const user = await User.findById(userId);
  if (!user) throw new ApiError("User not found", 404);
  const addressData: IAddress = {
    lng,
    lat,
    street,
    city,
    phone,
    province,
  };

  user.addresses.push(addressData);
  await user.save();
  console.log(user.addresses);
  return {
    success: true,
    message: "Address added successfully",
    addresses: user.addresses,
    statusCode: 201,
  };
};

export const updateAddressDB = async (
  params: IUpdateAddressParams
): Promise<IResult<IAddress[]>> => {
  const { userId, province, city, street, phone, lng, lat, addressId } = params;
  const user = await User.findById(userId);
  if (!user) throw new ApiError("User not found", 404);
  const addressData: IAddress = {
    lng,
    lat,
    street,
    city,
    phone,
    province,
  };

  user.addresses = user.addresses.map((addr) => {
    if (addr._id?.toString() == addressId) {
      return addressData;
    }
    return addr;
  });

  await user.save();

  return {
    success: true,
    message: "Address updated successfully",
    addresses: user.addresses,
    statusCode: 201,
  };
};

export const deleteAddressDB = async ({
  userId,
  addressId,
}: IDeleteAddressParams): Promise<IResult<IAddress[]>> => {
  const user = await User.findById(userId);

  if (!user) throw new ApiError("User not found", 404);

  user.addresses = user.addresses.filter(
    (addr) => addr._id?.toString() != addressId
  );

  await user.save();

  return {
    success: true,
    message: "Address deleted successfully",
    addresses: user.addresses,
    statusCode: 201,
  };
};

export const setDefaultAddressDB = async ({
  userId,
  addressId,
}: ISetDefaultAddressParams): Promise<IResult<IAddress[]>> => {
  const user = await User.findById(userId);

  if (!user) throw new ApiError("User not found", 404);
  let defaultAddress;
  user.addresses = user.addresses.filter((addr) => {
    if (addr._id?.toString() != addressId) return addr;
    defaultAddress = addr;
  });
  if (!defaultAddress) throw new ApiError("Address not found", 404);
  user.addresses.push(defaultAddress);
  await user.save();

  return {
    success: true,
    message: "Address set as default successfully",
    addresses: user.addresses,
    statusCode: 201,
  };
};
