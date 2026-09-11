import multer, { FileFilterCallback } from "multer";
import streamifier from "streamifier";
import { Request, Response, NextFunction } from "express";
import cloudinary from "../config/cloudinary";
import HttpError from "../models/http-error";

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        cloudinaryUrl?: string;
        cloudinaryPublicId?: string;
      }
    }
  }
}

const MIME_TYPE_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb: FileFilterCallback) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PNG/JPG allowed."));
    }
  },
});

export const uploadToCloudinary = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  const stream = cloudinary.uploader.upload_stream(
    { folder: "relay" },
    (error: any, result: any) => {
      if (error) {
        return next(new HttpError("Image upload failed, please try again.", 500));
      }
      req.file!.cloudinaryUrl = result.secure_url;
      req.file!.cloudinaryPublicId = result.public_id;
      next();
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
};