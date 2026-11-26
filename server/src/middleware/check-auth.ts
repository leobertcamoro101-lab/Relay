import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express";
import HttpError from "../models/http-error.js";
import User from "../models/user.js";
import { isSessionCurrent } from "../util/session.js";

export interface AuthRequest extends Request {
  userData?: {
    userId: string;
  };
  validationError?: string; // ← add this line for Zod
}

interface DecodedToken {
  userId: string;
  email: string;
  pv?: string; // password fingerprint, see util/session.ts
}

export default async (req: AuthRequest, res: Response, next: NextFunction) => {
  // if block needed for CORS Policy
  if (req.method === "OPTIONS") {
    return next();
  }

  let decodeToken: DecodedToken;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error("Authentication failed!");
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new Error("Authentication failed!");
    }
    decodeToken = jwt.verify(token, process.env.JWT_KEY as string, { algorithms: ["HS256"] }) as DecodedToken;
  } catch (err) {
    return next(new HttpError("Authentication failed", 403));
  }

  // A token made at login carries a fingerprint of the password it was issued
  // for. If the password has been changed or reset since (or the account was
  // deleted), the token is dead even though it hasn't expired yet. Tokens
  // without the claim (issued before this existed) skip the lookup.
  if (decodeToken.pv !== undefined) {
    try {
      const user = await User.findById(decodeToken.userId).select("password");
      if (!user || !isSessionCurrent(decodeToken.pv, user.password)) {
        return next(new HttpError("Authentication failed", 403));
      }
    } catch (err) {
      return next(new HttpError("Authentication failed", 403));
    }
  }

  req.userData = { userId: decodeToken.userId };
  next();
};
