import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express";
import HttpError from "../models/http-error.js";

export interface AuthRequest extends Request {
  userData?: {
    userId: string;
  };
  validationError?: string; // ← add this line for Zod
}

interface DecodedToken {
  userId: string;
  email: string;
}

export default (req: AuthRequest, res: Response, next: NextFunction) => {
  // if block needed for CORS Policy
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error("Authentication failed!");
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new Error("Authentication failed!");
    }
    const decodeToken = jwt.verify(token, process.env.JWT_KEY as string) as DecodedToken;
    req.userData = { userId: decodeToken.userId };
    next();
  } catch (err) {
    const error = new HttpError("Authentication failed", 403);
    return next(error);
  }
};