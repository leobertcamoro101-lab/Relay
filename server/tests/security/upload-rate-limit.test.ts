import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// The limiter reads its max once, when the module loads, so set it first.
vi.hoisted(() => {
  process.env.UPLOAD_LIMIT_MAX = "2";
});

const { default: app } = await import("../../src/app.js");
const { createTestUser, tokenFor } = await import("../helpers/factories.js");

describe("upload rate limit", () => {
  it("answers 429 with a clear message once the limit is used up", async () => {
    const { user } = await createTestUser();
    const token = tokenFor(user);
    // A disallowed type is rejected (422) after the limiter has counted it,
    // so nothing is ever sent to Cloudinary.
    const upload = () =>
      request(app)
        .post("/api/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", Buffer.from("MZ"), { filename: "a.exe", contentType: "application/x-msdownload" });

    expect((await upload()).status).toBe(422);
    expect((await upload()).status).toBe(422);

    const limited = await upload();
    expect(limited.status).toBe(429);
    expect(limited.body.message).toMatch(/too many uploads/i);
  });
});
