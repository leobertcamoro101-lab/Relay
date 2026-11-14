import multer, { FileFilterCallback } from "multer";
import streamifier from "streamifier";
import { Request, Response, NextFunction } from "express";
import cloudinary from "../config/cloudinary.js";
import HttpError from "../models/http-error.js";

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

// ============================================
// NEW — chat message attachments (images, video, documents)
//
// Kept separate from `upload`/`uploadToCloudinary` above, which are
// deliberately PNG/JPG-only and 5MB for profile avatars. Attachments need
// a much wider MIME allowlist and a bigger size cap, and — unlike an
// avatar — a non-image file needs Cloudinary's resource_type: "auto" or
// it will try (and fail) to process a PDF/video as an image.
// ============================================

const ATTACHMENT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
]);

// Keep this in sync with the client's MAX_FILE_SIZE_BYTES in
// MessageInput.tsx — that check is just a convenience for the user, this
// one is the actual enforcement.
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export const uploadAttachmentFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type."));
    }
  },
});

export const pipeAttachmentToCloudinary = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    // Unlike the avatar flow (where no file is a valid "didn't change it"
    // case), this route's whole purpose is a file — no file is a client
    // error, not a no-op.
    return next(new HttpError("No file was uploaded.", 400));
  }

  const stream = cloudinary.uploader.upload_stream(
    { folder: "relay/attachments", resource_type: "auto" },
    (error: any, result: any) => {
      if (error) {
        return next(new HttpError("File upload failed, please try again.", 500));
      }
      req.file!.cloudinaryUrl = result.secure_url;
      req.file!.cloudinaryPublicId = result.public_id;
      next();
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
};
