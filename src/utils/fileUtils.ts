import { UploadedFile } from "express-fileupload";

export const getFileType = (
  mimeType: string | undefined
): "image" | "video" => {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  throw new Error("Unsupported file type");
};

export const validateFileTypes = (files: UploadedFile[]): boolean => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
  ];

  return files.every((file) => allowedTypes.includes(file.mimetype));
};
