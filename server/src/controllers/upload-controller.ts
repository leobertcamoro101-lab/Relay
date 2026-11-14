import { Request, Response, NextFunction } from "express";
import HttpError from "../models/http-error.js";

// The client already has the File object it just uploaded, so it already
// knows the name/type/size — all it needs back is where the file now
// lives. Keeping the response minimal also means this route never has to
// be trusted with echoing back client-supplied metadata as if it were
// verified.
export const uploadAttachment = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file?.cloudinaryUrl) {
    return next(new HttpError("File upload failed, please try again.", 500));
  }
  res.status(201).json({ url: req.file.cloudinaryUrl });
};
