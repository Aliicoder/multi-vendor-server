import { createClient } from "redis";
import { config } from "../config/environment";
import Product from "../models/Product";

export const redisClient = createClient({
  username: config.REDIS_USERNAME,
  password: config.REDIS_PASSWORD,
  socket: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
  },
});

const cacheAllProductNames = async () => {
  try {
    if (await redisClient.get("cached_product_names")) return;
    const products = await Product.find();
    const productNames = products.map((product) => product.name);
    await redisClient.set("cached_product_names", JSON.stringify(productNames));
    console.log("✅ Cached product names");
  } catch (error) {
    console.error("❌ Error caching product names:", error);
  }
};

export const connectToRedis = async () => {
  try {
    await redisClient.connect();
    console.log("✅ Redis connected");
    await cacheAllProductNames();
  } catch (error) {
    console.error("❌ Redis connection error:", error);
  }
};
