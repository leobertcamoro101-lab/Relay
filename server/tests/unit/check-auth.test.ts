import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { Response, NextFunction } from "express";
import checkAuth, { type AuthRequest } from "../../src/middleware/check-auth.js";

function fakeReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    method: "GET",
    headers: {},
    ...overrides,
  } as AuthRequest;
}

describe("checkAuth middleware", () => {
  it("lets OPTIONS requests through unconditionally (CORS preflight)", () => {
    const req = fakeReq({ method: "OPTIONS", headers: {} });
    const next = vi.fn() as unknown as NextFunction;

    checkAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(); // no error
    expect(req.userData).toBeUndefined();
  });

  it("rejects a request with no Authorization header", () => {
    const req = fakeReq({ headers: {} });
    const next = vi.fn() as unknown as NextFunction;

    checkAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const [error] = (next as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(error).toBeTruthy();
    expect(error.code).toBe(403);
  });

  it("rejects an Authorization header with no token part", () => {
    const req = fakeReq({ headers: { authorization: "Bearer" } });
    const next = vi.fn() as unknown as NextFunction;

    checkAuth(req, {} as Response, next);

    const [error] = (next as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(error.code).toBe(403);
  });

  it("rejects a garbage/invalid token", () => {
    const req = fakeReq({ headers: { authorization: "Bearer not-a-real-jwt" } });
    const next = vi.fn() as unknown as NextFunction;

    checkAuth(req, {} as Response, next);

    const [error] = (next as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(error.code).toBe(403);
    expect(req.userData).toBeUndefined();
  });

  it("rejects a token signed with the wrong secret", () => {
    const badToken = jwt.sign({ userId: "u1", email: "a@example.com" }, "wrong-secret");
    const req = fakeReq({ headers: { authorization: `Bearer ${badToken}` } });
    const next = vi.fn() as unknown as NextFunction;

    checkAuth(req, {} as Response, next);

    const [error] = (next as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(error.code).toBe(403);
  });

  it("attaches req.userData.userId for a valid token", () => {
    const token = jwt.sign(
      { userId: "u1", email: "a@example.com" },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" },
    );
    const req = fakeReq({ headers: { authorization: `Bearer ${token}` } });
    const next = vi.fn() as unknown as NextFunction;

    checkAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(); // no error
    expect(req.userData).toEqual({ userId: "u1" });
  });
});
