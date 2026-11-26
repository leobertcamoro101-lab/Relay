import multer from "multer";
import HttpError from "../models/http-error.js";

// Decides what the client is told when a request fails.
//
// Only errors written for users (HttpError) and a few known upload/body errors
// show their own message. Anything else — a Mongo error, a bug, a library
// exception — gets a generic message, because its text can contain database
// names, query shapes, file paths or other internals. The real error is still
// logged (and sent to Sentry) by the handler in app.ts.
export function toErrorResponse(error: unknown): { status: number; message: string } {
  if (error instanceof HttpError) {
    const code = Number(error.code);
    const status = Number.isInteger(code) && code >= 400 && code <= 599 ? code : 500;
    return { status, message: error.message };
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return { status: 413, message: "That file is too large." };
    }
    return { status: 400, message: "Upload failed, please check the file and try again." };
  }

  // body-parser and similar: malformed JSON, body too large, ... (4xx only)
  const status = (error as { status?: unknown; statusCode?: unknown } | null)?.status
    ?? (error as { statusCode?: unknown } | null)?.statusCode;
  if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status < 500) {
    return { status, message: "Invalid request." };
  }

  return { status: 500, message: "Something went wrong, please try again later." };
}
