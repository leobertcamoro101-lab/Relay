import { ZodType } from "zod";
import { Response, NextFunction } from "express";
import { AuthRequest } from "./check-auth";

// Runs a Zod schema against req.body and attaches a readable error message
// to req.validationError on failure — it does NOT reject the request here.
// Controllers check req.validationError themselves (same pattern as the
// old express-validator validationResult() check), so any existing
// cleanup logic (e.g. deleting an already-uploaded Cloudinary image on
// invalid input) keeps working exactly as before.
export const validateBody = (schema: ZodType) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      req.validationError = result.error.issues.map((issue) => issue.message).join(", ");
    } else {
      req.body = result.data;
    }
    next();
  };
};

export default validateBody;