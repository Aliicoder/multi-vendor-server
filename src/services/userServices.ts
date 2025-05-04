import { User } from "../models/User";
import {
  IAddAddressParams,
  IDeleteAddressParams,
  IGetPaginatedUsersParams,
  IUpdateAddressParams,
} from "../types/params";
import { IAddress, ISellerStatus } from "../types/schema";
import ApiError from "../utils/apiError";

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

export const addAddressDB = async (params: IAddAddressParams): Promise<any> => {
  try {
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
  } catch (error: any) {
    throw new ApiError(error.message ?? "Failed to add address", 500);
  }
};

export const updateAddressDB = async (
  params: IUpdateAddressParams
): Promise<any> => {
  try {
    const { userId, province, city, street, phone, lng, lat, addressId } =
      params;
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
  } catch (error: any) {
    throw new ApiError(error.message ?? "Failed to updated address", 500);
  }
};

export const deleteAddressDB = async ({
  userId,
  addressId,
}: IDeleteAddressParams): Promise<any> => {
  try {
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
  } catch (error: any) {
    throw new ApiError(error.message ?? "Failed to delete address", 500);
  }
};

export const setDefaultAddressDB = async ({
  userId,
  addressId,
}: IDeleteAddressParams): Promise<any> => {
  try {
    const user = await User.findById(userId);

    if (!user) throw new ApiError("User not found", 404);
    let defaultAddress;
    user.addresses = user.addresses.filter((addr) => {
      if (addr._id?.toString() != addressId) return addr;
      defaultAddress = addr;
    });
    if (!defaultAddress) {
      return { success: false, error: "Address not found", statusCode: 404 };
    }
    user.addresses.push(defaultAddress);
    await user.save();

    return {
      success: true,
      message: "Address set as default successfully",
      addresses: user.addresses,
      statusCode: 201,
    };
  } catch (error: any) {
    throw new ApiError(error.message ?? "Failed to set default address", 500);
  }
};
