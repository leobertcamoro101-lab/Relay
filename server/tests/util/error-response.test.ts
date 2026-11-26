import { describe, it, expect } from "vitest";
import multer from "multer";
import HttpError from "../../src/models/http-error.js";
import { toErrorResponse } from "../../src/util/error-response.js";

describe("toErrorResponse", () => {
  it("shows the message and status of an HttpError", () => {
    expect(toErrorResponse(new HttpError("Invalid credentials, could not log you in", 403))).toEqual({
      status: 403,
      message: "Invalid credentials, could not log you in",
    });
  });

  it("keeps the message of a user-facing 500 HttpError", () => {
    const res = toErrorResponse(new HttpError("Signing up failed, please try again.", 500));
    expect(res.status).toBe(500);
    expect(res.message).toBe("Signing up failed, please try again.");
  });

  it("hides the details of an unexpected error", () => {
    const res = toErrorResponse(new Error("E11000 duplicate key error collection: relay.users index: email_1"));
    expect(res.status).toBe(500);
    expect(res.message).toBe("Something went wrong, please try again later.");
    expect(res.message).not.toContain("E11000");
  });

  it("does not use a non-HTTP numeric code (like a Mongo 11000) as the status", () => {
    const err = Object.assign(new Error("dup"), { code: 11000 });
    expect(toErrorResponse(err).status).toBe(500);
  });

  it("turns an oversized upload into a 413", () => {
    const err = new multer.MulterError("LIMIT_FILE_SIZE");
    expect(toErrorResponse(err)).toEqual({ status: 413, message: "That file is too large." });
  });

  it("turns other upload errors into a generic 400", () => {
    const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE");
    expect(toErrorResponse(err).status).toBe(400);
  });

  it("keeps a 4xx from body parsing (e.g. malformed JSON) but not its text", () => {
    const err = Object.assign(new SyntaxError("Unexpected token } in JSON at position 12"), { status: 400 });
    expect(toErrorResponse(err)).toEqual({ status: 400, message: "Invalid request." });
  });

  it("handles non-Error values", () => {
    expect(toErrorResponse(null).status).toBe(500);
    expect(toErrorResponse("boom").status).toBe(500);
  });
});
