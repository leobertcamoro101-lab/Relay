import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Never hit the real Brevo API from tests.
vi.mock("../../src/util/brevo-email.js", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const { default: app } = await import("../../src/app.js");
const { createTestUser, tokenFor } = await import("../helpers/factories.js");

const validSignupBody = {
  firstName: "Pat",
  lastName: "Doe",
  birthday: "1995-05-05",
  gender: "custom" as const,
  email: `signup-${Date.now()}@example.com`,
};

describe("password validation", () => {
  it("rejects signup with a too-short password", async () => {
    const res = await request(app)
      .post("/api/users/signup")
      .send({ ...validSignupBody, password: "12345" });

    expect(res.status).toBe(422);
  });

  it("accepts signup with a password that meets the minimum length", async () => {
    const res = await request(app)
      .post("/api/users/signup")
      .send({ ...validSignupBody, email: `ok-${Date.now()}@example.com`, password: "123456" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  it("rejects reset-password with a too-short new password", async () => {
    const res = await request(app)
      .post("/api/users/reset-password")
      .send({ token: "some-token-value", password: "abc" });

    expect(res.status).toBe(422);
  });

  it("rejects change-password with a too-short new password", async () => {
    const { user } = await createTestUser();
    const token = tokenFor(user);

    const res = await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "password123", newPassword: "abc" });

    expect(res.status).toBe(422);
  });

  it("rejects change-password with an empty current password", async () => {
    const { user } = await createTestUser();
    const token = tokenFor(user);

    const res = await request(app)
      .patch(`/api/users/${user.id}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "", newPassword: "newpassword123" });

    expect(res.status).toBe(422);
  });
});
