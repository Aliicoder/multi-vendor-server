import mongoose from "mongoose";
import { config } from "../config/environment";
export const connectToDatabase = async () => {
  try {
    await mongoose.connect(config.CONNECTION_URL);
    console.log("✅ mongoose connected");
  } catch (error) {
    console.error("❌ mongoose connection error:", error);
  }
};
