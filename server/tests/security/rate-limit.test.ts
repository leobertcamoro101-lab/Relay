import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// server/src/routes/users-routes.ts relaxes authLimiter/forgotPasswordLimiter
// to max: 1000 whenever NODE_ENV === "test" (a carve-out that predates this
// test suite) so real login/signup flows don't get throttled while a whole
// test file runs. Vitest sets NODE_ENV=test automatically, so we can't
// cheaply drive either limiter to its real production threshold (10/15min,
// 5/hour) here without either being extremely slow or reaching into module
// internals in a way that could destabilize the other test files sharing
// this process. Instead, this just confirms the limiter middleware is
// actually wired up on these routes (via its response headers) — the
// threshold values themselves are a one-line change to review by eye in
// users-routes.ts, not something worth a brittle test.
describe("rate limiting", () => {
  it("attaches rate-limit headers to POST /api/users/login", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "nobody@example.com", password: "whatever" });

    const hasRateLimitHeader = Object.keys(res.headers).some((h) =>
      h.toLowerCase().includes("ratelimit"),
    );
    expect(hasRateLimitHeader).toBe(true);
  });

  it("attaches rate-limit headers to POST /api/users/forgot-password", async () => {
    const res = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "nobody@example.com" });

    const hasRateLimitHeader = Object.keys(res.headers).some((h) =>
      h.toLowerCase().includes("ratelimit"),
    );
    expect(hasRateLimitHeader).toBe(true);
  });
});
