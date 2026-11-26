import { describe, it, expect, vi } from "vitest";
import extractCurrentPassword from "../../src/middleware/extract-current-password.js";

const run = (body: unknown) => {
  const req: any = { body };
  const next = vi.fn();
  extractCurrentPassword(req, {} as any, next);
  return { req, next };
};

describe("extractCurrentPassword", () => {
  it("moves the password out of the body into req.currentPassword", () => {
    const { req, next } = run({ firstName: "A", currentPassword: "secret123" });
    expect(req.currentPassword).toBe("secret123");
    expect(req.body).toEqual({ firstName: "A" });
    expect(next).toHaveBeenCalledOnce();
  });

  it("leaves req.currentPassword unset when none was sent", () => {
    const { req } = run({ firstName: "A" });
    expect(req.currentPassword).toBeUndefined();
  });

  it("ignores a non-string password but still strips it from the body", () => {
    const { req } = run({ currentPassword: { $ne: "" }, firstName: "A" });
    expect(req.currentPassword).toBeUndefined();
    expect(req.body).toEqual({ firstName: "A" });
  });

  it("copes with a missing body", () => {
    const { next } = run(undefined);
    expect(next).toHaveBeenCalledOnce();
  });
});
