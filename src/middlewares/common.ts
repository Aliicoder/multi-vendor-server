import { Application } from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fileUpload from "express-fileupload";
import express from "express";
export const setupCommonMiddleware = (app: Application) => {
  // Parse cookies
  app.use(cookieParser());

  // Development logging
  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  // Body parser, reading data from body into req.body
  app.use(express.json({ limit: "10kb" }));

  // File upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
      abortOnLimit: true,
      responseOnLimit: "File size limit exceeded",
    })
  );
};
