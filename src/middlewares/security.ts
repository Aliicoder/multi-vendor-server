import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { Application } from "express";

export const setupSecurity = (app: Application) => {
  // Set security HTTP headers
  app.use(helmet());

  // Rate limiting
  app.use(
    rateLimit({
      max: 500,
      windowMs: 60 * 60 * 1000,
      message: "Rate limit exceeded",
    })
  );

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Prevent parameter pollution
  app.use(hpp({ whitelist: ["duration"] }));

  // Enable CORS
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
      ],
      methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
      credentials: true,
    })
  );
};
