import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { Response, NextFunction } from "express";
import { validateBody } from "../../src/middleware/validate-zod.js";
import type { AuthRequest } from "../../src/middleware/check-auth.js";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  age: z.number().min(0, "Age must be non-negative."),
});

function fakeReq(body: unknown): AuthRequest {
  return { body } as AuthRequest;
}

describe("validateBody", () => {
  it("replaces req.body with the parsed data and calls next() on success", () => {
    const req = fakeReq({ name: "  Alice  ", age: 30 });
    const next = vi.fn() as unknown as NextFunction;

    validateBody(schema)(req, {} as Response, next);

    // zod's .trim() coercion proves req.body was replaced with the
    // *parsed* output, not just left alone.
    expect(req.body).toEqual({ name: "Alice", age: 30 });
    expect(req.validationError).toBeUndefined();
    expect(next).toHaveBeenCalledWith(); // called with no error
  });

  it("sets req.validationError with a joined message on failure, but still calls next()", () => {
    const req = fakeReq({ name: "", age: -5 });
    const next = vi.fn() as unknown as NextFunction;

    validateBody(schema)(req, {} as Response, next);

    expect(req.validationError).toContain("Name is required.");
    expect(req.validationError).toContain("Age must be non-negative.");
    // validateBody never rejects the request itself — controllers check
    // req.validationError themselves — so next() must still be called.
    expect(next).toHaveBeenCalledWith();
  });

  it("does not mutate req.body when validation fails", () => {
    const original = { name: "", age: -5 };
    const req = fakeReq(original);
    const next = vi.fn() as unknown as NextFunction;

    validateBody(schema)(req, {} as Response, next);

    expect(req.body).toBe(original);
  });
});
