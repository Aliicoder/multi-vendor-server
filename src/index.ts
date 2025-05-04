import app from "./api";
import { connectToDatabase } from "./utils/mongoose";
import { config } from "./config/environment";
import { connectToRedis } from "./utils/redisClient";

connectToDatabase();
connectToRedis();

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

app.listen(config.PORT, async () => {
  console.log(`✅ Server listening on port ${config.PORT}`);
});
