import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Same mock as auth.test.ts, but we keep a handle on it so we can count the
// reset emails that were (or were not) sent.
vi.mock("../../src/util/brevo-email.js", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const { default: app } = await import("../../src/app.js");
const { default: sendResetPasswordEmail } = await import("../../src/util/brevo-email.js");
const { createTestUser, tokenFor } = await import("../helpers/factories.js");

const profileBody = (
  user: { firstName: string; lastName: string },
  email: string,
  extra: Record<string, string> = {},
) => ({
  firstName: user.firstName,
  lastName: user.lastName,
  birthday: "1990-01-01",
  gender: "custom",
  email,
  ...extra,
});

const resetEmailsTo = (email: string) =>
  vi.mocked(sendResetPasswordEmail).mock.calls.filter((call) => call[0] === email);

describe("changing your email needs your current password", () => {
  it("rejects an email change with no current password (401) and keeps the old email", async () => {
    const { user, plainPassword } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(profileBody(user, `new-${Date.now()}-a@example.com`));

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/current password/i);

    // the old email still logs in
    await request(app)
      .post("/api/users/login")
      .send({ email: user.email, password: plainPassword })
      .expect(200);
  });

  it("rejects an email change with the wrong current password (401)", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(profileBody(user, `new-${Date.now()}-b@example.com`, { currentPassword: "definitely-wrong" }));

    expect(res.status).toBe(401);
  });

  it("changes the email with the correct current password", async () => {
    const { user, plainPassword } = await createTestUser();
    const newEmail = `new-${Date.now()}-c@example.com`;

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(profileBody(user, newEmail, { currentPassword: plainPassword }));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(newEmail);
    // the password is never echoed back
    expect(JSON.stringify(res.body)).not.toContain(plainPassword);

    await request(app)
      .post("/api/users/login")
      .send({ email: newEmail, password: plainPassword })
      .expect(200);
  });

  it("does not ask for a password when the email is unchanged", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ ...profileBody(user, user.email), firstName: "Renamed" });

    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe("Renamed");
  });

  it("checks the password before the 'already in use' lookup, so it can't be used to probe emails", async () => {
    const { user } = await createTestUser();
    const { user: other } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(profileBody(user, other.email));

    expect(res.status).toBe(401);
  });

  it("still reports a taken email (422) once the password is correct", async () => {
    const { user, plainPassword } = await createTestUser();
    const { user: other } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(profileBody(user, other.email, { currentPassword: plainPassword }));

    expect(res.status).toBe(422);
  });
});

describe("upload file-type errors", () => {
  it("rejects a disallowed avatar type with 422 and a readable message", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .field("firstName", user.firstName)
      .field("lastName", user.lastName)
      .field("birthday", "1990-01-01")
      .field("gender", "custom")
      .field("email", user.email)
      .attach("image", Buffer.from("not a real image"), {
        filename: "not-an-image.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/invalid file type/i);
  });

  it("rejects a disallowed attachment type with 422 (not a 500)", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .attach("file", Buffer.from("MZ fake executable"), {
        filename: "setup.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/unsupported file type/i);
  });
});

describe("forgot-password per-account cooldown", () => {
  it("sends one email for two requests in a row but answers both the same way", async () => {
    const { user } = await createTestUser();

    const first = await request(app).post("/api/users/forgot-password").send({ email: user.email });
    const second = await request(app).post("/api/users/forgot-password").send({ email: user.email });

    expect(first.status).toBe(200);
    expect(second.status).toBe(first.status);
    expect(second.body.message).toBe(first.body.message);
    expect(resetEmailsTo(user.email)).toHaveLength(1);
  });

  it("keeps the first reset link valid when a second request is ignored", async () => {
    const { user } = await createTestUser();

    await request(app).post("/api/users/forgot-password").send({ email: user.email });
    const token = resetEmailsTo(user.email)[0][1] as string;
    await request(app).post("/api/users/forgot-password").send({ email: user.email });

    const res = await request(app)
      .post("/api/users/reset-password")
      .send({ token, password: "correct-horse-battery" });
    expect(res.status).toBe(200);
  });

  it("does not make different accounts wait on each other", async () => {
    const { user: a } = await createTestUser();
    const { user: b } = await createTestUser();

    await request(app).post("/api/users/forgot-password").send({ email: a.email });
    await request(app).post("/api/users/forgot-password").send({ email: b.email });

    expect(resetEmailsTo(a.email)).toHaveLength(1);
    expect(resetEmailsTo(b.email)).toHaveLength(1);
  });
});
