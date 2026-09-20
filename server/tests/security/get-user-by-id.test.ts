import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, tokenFor } from "../helpers/factories.js";

// Regression tests for the broken-auth / IDOR finding on GET /api/users/:uid:
// the route used to sit above `router.use(checkAuth)` and had its ownership
// check commented out, so anyone (even without a token) could fetch any
// user's full profile by guessing/incrementing their id.
describe("GET /api/users/:uid", () => {
  it("rejects requests with no auth token at all", async () => {
    const { user } = await createTestUser();

    const res = await request(app).get(`/api/users/${user.id}`);

    expect(res.status).toBe(403);
  });

  it("rejects a token that doesn't belong to the requested profile", async () => {
    const { user: owner } = await createTestUser();
    const { user: attacker } = await createTestUser();
    const attackerToken = tokenFor(attacker);

    const res = await request(app)
      .get(`/api/users/${owner.id}`)
      .set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not allowed/i);
  });

  it("lets a user fetch their own profile, without the password hash", async () => {
    const { user } = await createTestUser();
    const token = tokenFor(user);

    const res = await request(app)
      .get(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.resetPasswordToken).toBeUndefined();
  });
});
