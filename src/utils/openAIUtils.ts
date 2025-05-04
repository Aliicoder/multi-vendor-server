import OpenAI from "openai";
import { config } from "../config/environment";
import Product from "../models/Product";
import { redisClient } from "./redisClient";

export const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export const cacheAllProductNames = async () => {
  const products = await Product.find({}, { name: 1, _id: 0 });
  const names = products.map((p) => p.name).join(", ");
  await redisClient.set("cached_product_names", names);
  console.log("[Redis] Product names cached.");
};
