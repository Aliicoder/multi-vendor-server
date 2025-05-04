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

export const getPaginatedProductsDB = async (
  params: IFetchProductsParams
): Promise<any> => {
  const { query, curPage = 1, perPage = 5, sort } = params;
  const skip = (curPage - 1) * perPage;
  let products, count;
  if (sort) {
    [products, count] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(perPage),
      Product.countDocuments(query),
    ]);
  } else {
    [products, count] = await Promise.all([
      Product.find(query).skip(skip).limit(perPage),
      Product.countDocuments(query),
    ]);
  }
  return {
    success: true,
    products,
    pagesLen: Math.ceil(count / perPage),
    message: "Products fetched successfully",
    statusCode: 200,
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
): Promise<any> => {
  const { prompt } = params;
  const cachedProductNames = await redisClient.get("cached_product_names");
  if (!cachedProductNames)
    throw new ApiError("Cached product names not found", 404);

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

  const names = completion.choices[0]?.message?.content?.split(",");
  const products = await Product.find({ name: { $in: names } });
  if (products.length === 0)
    throw new ApiError("Could not suggest any products", 404);

  return {
    success: true,
    products,
    statusCode: 200,
    message: "suggested products fetched successfully",
  };
};

export const addProductDB = async (params: IAddProductParams): Promise<any> => {
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
  const productData: IProduct = {
    name,
    description,
    brand,
    stock: Number(stock),
    price: Number(price),
    rating: 0,
    sales: 0,
    discount: Number(discount),
    category,
    sellerId: new Types.ObjectId(sellerId),
    media: mediaObjects,
    shopName: seller?.name,
  };
  const product = await Product.create(productData);

  return {
    success: true,
    statusCode: 201,
    message: "Product created successfully",
    product,
  };
};

export const updateProductDB = async (
  params: IUpdateProductParams
): Promise<any> => {
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
    media,
  } = params;

  const existingProduct = await Product.findById(productId);
  if (!existingProduct) throw new ApiError("Product not found", 404);

  if (!existingProduct.sellerId.equals(new Types.ObjectId(sellerId)))
    throw new ApiError("You are not authorized to update this product", 403);

  let mediaObjects = [...existingProduct.media];
  if (deletedMedia && deletedMedia.length > 0) {
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

    mediaObjects = mediaObjects.filter(
      (media) => !deletedMedia.includes(media.publicId)
    );
  }

  if (media && media.length > 0) {
    const newMedia = await Promise.all(
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
            ACL: "public-read",
          })
        );

        return {
          url: `https://${config.AWS_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`,
          publicId: key,
          type: mediaType,
        };
      })
    );
    mediaObjects.push(...newMedia);
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      name,
      description,
      brand,
      stock: Number(stock),
      price: Number(price),
      discount: Number(discount),
      category,
      media: mediaObjects,
    },
    { new: true }
  );

  return {
    statusCode: 200,
    message: "Product updated successfully",
    product: updatedProduct,
  };
};
