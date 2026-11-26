import { Response, NextFunction } from "express";
import { AuthRequest } from "./check-auth.js";

// Moves `currentPassword` out of the request body into req.currentPassword.
// The profile form is multipart and its Zod schema only knows the profile
// fields, so the password is taken out first: the schema never sees it (and
// can't reject or strip it), and it can't end up in anything that is saved
// or logged from req.body.
export default (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    if (typeof req.body.currentPassword === "string") {
      req.currentPassword = req.body.currentPassword;
    }
    delete req.body.currentPassword;
  }
  next();
};
