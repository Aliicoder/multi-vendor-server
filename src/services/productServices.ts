import { v4 as uuidv4 } from "uuid";
import Product from "../models/Product";
import s3Client from "../utils/s3Client";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getFileType } from "../utils/fileUtils";
import {
  IAddProductParams,
  IFetchProductsParams,
  IGetAISearchedProductsParams,
  IGetSearchedProductsParams,
  IUpdateProductParams,
} from "../types/params";
import { config } from "../config/environment";
import { Types } from "mongoose";
import { redisClient } from "../utils/redisClient";
import ApiError from "../utils/apiError";
import { openai } from "../utils/openAIUtils";
import { User } from "../models/User";
import { IProduct, IUser } from "../types/schema";
import Category from "../models/Category";
import { IResult } from "../types/custom";

export const getPaginatedProductsDB = async (
  params: IFetchProductsParams
): Promise<any> => {
  const { query, curPage = 1, perPage = 5, sort } = params;
  const skip = (curPage - 1) * perPage;

  const [products, numOfProducts, maxPrice, maxStock, maxSales] =
    await Promise.all([
      sort
        ? Product.find(query).sort(sort).skip(skip).limit(perPage)
        : Product.find(query).skip(skip).limit(perPage),
      Product.countDocuments(query),
      Product.aggregate([
        { $group: { _id: null, maxPrice: { $max: "$price" } } },
      ]),
      Product.aggregate([
        { $group: { _id: null, maxStock: { $max: "$stock" } } },
      ]),
      Product.aggregate([
        { $group: { _id: null, maxSales: { $max: "$sales" } } },
      ]),
    ]);

  if (skip >= numOfProducts) throw new ApiError("Invalid page number", 404);

  const pagesLen = Math.ceil(numOfProducts / perPage);
  return {
    success: true,
    products,
    pagesLen,
    message: "Products fetched successfully",
    statusCode: 200,
    maxPrice: maxPrice[0]?.maxPrice || 0,
    maxStock: maxStock[0]?.maxStock || 0,
    maxSales: maxSales[0]?.maxSales || 0,
  };
};

export const getProductDB = async (productId: string): Promise<any> => {
  const product = await Product.findById(productId);
  if (!product) throw new ApiError("Product not found", 404);

  return {
    success: true,
    product,
    statusCode: 200,
    message: "Product fetched successfully",
  };
};

export const getSearchedProductsDB = async (
  params: IGetSearchedProductsParams
): Promise<any> => {
  const { name } = params;
  const searchRegex = new RegExp(name, "i");

  const result = await Product.aggregate([
    {
      $match: {
        $or: [{ name: searchRegex }, { description: searchRegex }],
      },
    },
    {
      $facet: {
        products: [
          { $limit: 3 },
          {
            $project: {
              name: 1,
              brand: 1,
              category: 1,
              price: 1,
              media: 1,
            },
          },
        ],
        brands: [
          {
            $group: {
              _id: "$brand",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ],
        categories: [
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ],
      },
    },
  ]);

  const suggestions = {
    products: result[0].products,
    brands: result[0].brands.map((b: any) => b._id),
    categories: result[0].categories.map((c: any) => c._id),
  };
  return {
    success: true,
    suggestions,
    statusCode: 200,
    message: "Products fetched successfully",
  };
};

export const getAISearchedProductsDB = async (
  params: IGetAISearchedProductsParams
): Promise<IResult<IProduct>> => {
  const { prompt, curPage = 1, perPage = 5, outOfStock = false } = params;
  const cachedProductNames = JSON.parse(
    (await redisClient.get("cached_product_names")) as string
  ) as string[];

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Based on the following product list: "${cachedProductNames}", suggest the most relevant products for 
          the prompt: "${prompt}". Respond with just the names as comma separated values.`,
      },
    ],
  });

  const aiResponse = completion.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new ApiError("No response from AI service", 500);
  }

  const namePatterns = aiResponse
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name) => new RegExp(name, "i"));

  const products = await Product.find({
    name: { $in: namePatterns },
  })
    .sort({ createdAt: -1 })
    .skip((curPage - 1) * perPage)
    .limit(perPage);

  if (products.length === 0) {
    throw new ApiError("Could not find any matching products", 404);
  }

  return {
    success: true,
    data: products,
    statusCode: 200,
    message: "Suggested products fetched successfully",
  };
};

export const addProductDB = async (
  params: IAddProductParams
): Promise<IResult<void>> => {
  const {
    sellerId,
    name,
    description,
    brand,
    stock,
    price,
    discount = 0,
    category,
    media,
  } = params;

  const existingProduct = await Product.findOne({
    name,
    sellerId,
  });

  if (existingProduct)
    throw new ApiError(
      "Product with this name already exists for your account",
      409
    );

  const mediaObjects = await Promise.all(
    media.map(async (file) => {
      const fileExtension = file.name.split(".").pop();
      const key = `products/${sellerId}/${uuidv4()}.${fileExtension}`;
      const mediaType = getFileType(file.mimetype);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.AWS_BUCKET_NAME,
          Key: key,
          Body: file.data,
          ContentType: file.mimetype,
        })
      );

      return {
        url: `https://${config.AWS_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`,
        publicId: key,
        type: mediaType,
      };
    })
  );

  const seller: IUser | null = await User.findById(sellerId);
  if (!seller) throw new ApiError("Seller not found", 404);
  const path = await Category.findOne({ name: category }).then(
    (category) => category?.path
  );
  if (!path) throw new ApiError("Category not found", 404);

  if (!seller.businessName) throw new ApiError("Business name not found", 404);

  const productData: IProduct = {
    name,
    description,
    brand,
    stock: Number(stock),
    price: Number(price),
    rating: 0,
    sales: 0,
    discount: Number(discount),
    category: path,
    sellerId: new Types.ObjectId(sellerId),
    media: mediaObjects,
    shopName: seller?.businessName,
  };

  await Product.create(productData);

  return {
    success: true,
    statusCode: 201,
    message: "Product created successfully",
  };
};

export const updateProductDB = async (
  params: IUpdateProductParams
): Promise<IResult<void>> => {
  const {
    productId,
    sellerId,
    name,
    discount,
    deletedMedia,
    description,
    brand,
    stock,
    price,
    category,
    media: newMediaFiles,
  } = params;

  const existingProduct = await Product.findById(productId);
  if (!existingProduct) throw new ApiError("Product not found", 404);

  if (!existingProduct.sellerId.toString().equals(sellerId))
    throw new ApiError("Unauthorized", 403);

  let updatedMedia = [...existingProduct.media];

  if (deletedMedia && deletedMedia?.length) {
    try {
      await Promise.all(
        deletedMedia.map(async (publicId) => {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: config.AWS_BUCKET_NAME,
              Key: publicId,
            })
          );
        })
      );

      updatedMedia = updatedMedia.filter(
        (media) => !deletedMedia.includes(media.publicId)
      );
    } catch (error) {
      throw new ApiError("Failed to delete media", 500);
    }
  }

  if (newMediaFiles?.length) {
    try {
      const uploadedMedia = await Promise.all(
        newMediaFiles.map(async (file) => {
          if (!file?.name || !file?.mimetype || !file?.data) {
            throw new Error("Invalid file format");
          }

          const fileExtension = file.name.split(".").pop();
          const key = `products/${sellerId}/${uuidv4()}.${fileExtension}`;
          const mediaType = getFileType(file.mimetype);

          await s3Client.send(
            new PutObjectCommand({
              Bucket: config.AWS_BUCKET_NAME,
              Key: key,
              Body: file.data,
              ContentType: file.mimetype,
            })
          );

          return {
            url: `https://${config.AWS_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`,
            publicId: key,
            type: mediaType,
          };
        })
      );
      updatedMedia.push(...uploadedMedia);
    } catch (error) {
      throw new ApiError("Failed to upload media", 500);
    }
  }

  const path = await Category.findOne({ name: category }).then(
    (category) => category?.path
  );

  const seller: IUser | null = await User.findById(sellerId);
  if (!seller?.businessName) throw new ApiError("Business name not found", 404);

  const updateData: Partial<IProduct> = {
    name,
    description,
    brand,
    stock: Number(stock),
    price: Number(price),
    discount: Number(discount),
    category: path,
    media: updatedMedia,
    shopName: seller.businessName,
  };

  await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
  });

  return {
    success: true,
    statusCode: 200,
    message: "Product updated successfully",
  };
};
