import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../../src/util/brevo-email.js", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const { default: app } = await import("../../src/app.js");
const { createTestUser, tokenFor } = await import("../helpers/factories.js");

const validSignupBody = () => ({
  firstName: "Jordan",
  lastName: "Rivera",
  birthday: "1992-03-14",
  gender: "custom" as const,
  email: `jordan-${Date.now()}-${Math.random()}@example.com`,
  password: "correct-horse",
});

describe("POST /api/users/signup", () => {
  it("creates a user and returns a token", async () => {
    const res = await request(app).post("/api/users/signup").send(validSignupBody());

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.userId).toBeTruthy();
  });

  it("rejects missing required fields", async () => {
    const res = await request(app)
      .post("/api/users/signup")
      .send({ email: "incomplete@example.com", password: "correct-horse" });

    expect(res.status).toBe(422);
  });

  it("rejects a duplicate email", async () => {
    const body = validSignupBody();
    await request(app).post("/api/users/signup").send(body).expect(201);

    const res = await request(app).post("/api/users/signup").send(body);
    expect(res.status).toBe(422);
  });
});

describe("POST /api/users/login", () => {
  it("logs in with correct credentials", async () => {
    const { user, plainPassword } = await createTestUser({ email: `login-${Date.now()}@example.com` });

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: user.email, password: plainPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.userId).toBe(user.id);
  });

  it("rejects a wrong password", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: user.email, password: "totally-wrong" });

    expect(res.status).toBe(403);
  });

  it("rejects an email that doesn't exist, with the same status/message as a wrong password", async () => {
    // Regression check for the login-timing/user-enumeration fix: a
    // nonexistent user must be indistinguishable from a wrong password —
    // same status code, same message.
    const wrongPasswordRes = await (async () => {
      const { user } = await createTestUser();
      return request(app).post("/api/users/login").send({ email: user.email, password: "nope" });
    })();

    const noSuchUserRes = await request(app)
      .post("/api/users/login")
      .send({ email: `nobody-${Date.now()}@example.com`, password: "nope" });

    expect(noSuchUserRes.status).toBe(wrongPasswordRes.status);
    expect(noSuchUserRes.body.message).toBe(wrongPasswordRes.body.message);
  });
});

describe("POST /api/users/forgot-password", () => {
  it("returns the same generic message for an existing email", async () => {
    const { user } = await createTestUser();

    const res = await request(app).post("/api/users/forgot-password").send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email exists/i);
  });

  it("returns the identical response for a nonexistent email (no enumeration)", async () => {
    const existingRes = await (async () => {
      const { user } = await createTestUser();
      return request(app).post("/api/users/forgot-password").send({ email: user.email });
    })();

    const missingRes = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: `ghost-${Date.now()}@example.com` });

    expect(missingRes.status).toBe(existingRes.status);
    expect(missingRes.body.message).toBe(existingRes.body.message);
  });
});

describe("PATCH /api/users/:uid/password", () => {
  it("changes the password with the correct current password", async () => {
    const { user, plainPassword } = await createTestUser();
    const token = tokenFor(user);

    const res = await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: plainPassword, newPassword: "brand-new-password" });

    expect(res.status).toBe(200);

    // and the new password actually works on the next login
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ email: user.email, password: "brand-new-password" });
    expect(loginRes.status).toBe(200);
  });

  it("rejects the wrong current password", async () => {
    const { user } = await createTestUser();
    const token = tokenFor(user);

    const res = await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "definitely-wrong", newPassword: "brand-new-password" });

    expect(res.status).toBe(401);
  });
});

describe("search / protected routes", () => {
  it("GET /api/users requires auth", async () => {
    const res = await request(app).get("/api/users?q=a");
    expect(res.status).toBe(403);
  });

  it("GET /api/users searches by name/email once authenticated", async () => {
    const { user: searcher } = await createTestUser();
    const token = tokenFor(searcher);
    const uniqueName = `Zephyrine${Date.now()}`;
    await createTestUser({ firstName: uniqueName });

    const res = await request(app)
      .get(`/api/users?q=${uniqueName}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].firstName).toBe(uniqueName);
    // never leak password hashes in search results
    expect(res.body.users[0].password).toBeUndefined();
  });
});
