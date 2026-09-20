import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Never hit the real Cloudinary API from tests. This mock stands in for
// both file-upload.ts's uploadToCloudinary (upload_stream) and
// cloudinary-cleanup.ts's deleteCloudinaryImage (destroy) — both import
// the same config/cloudinary.js module.
const destroyMock = vi.fn().mockResolvedValue({ result: "ok" });
vi.mock("../../src/config/cloudinary.js", async () => {
  const { Writable } = await import("node:stream");
  return {
    default: {
      uploader: {
        upload_stream: (
          _options: unknown,
          callback: (error: unknown, result: { secure_url: string; public_id: string }) => void,
        ) => {
          const chunks: Buffer[] = [];
          const writable = new Writable({
            write(chunk, _enc, cb) {
              chunks.push(chunk);
              cb();
            },
          });
          writable.on("finish", () => {
            const fakeId = `fake-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            callback(null, {
              secure_url: `https://res.cloudinary.com/test/image/upload/v1/relay/${fakeId}.png`,
              public_id: `relay/${fakeId}`,
            });
          });
          return writable;
        },
        destroy: destroyMock,
      },
    },
  };
});

const { default: app } = await import("../../src/app.js");
const { createTestUser, tokenFor } = await import("../helpers/factories.js");
const { extractPublicId } = await import("../../src/util/cloudinary-cleanup.js");

const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("PATCH /api/users/:uid (profile update)", () => {
  it("updates text fields without an image", async () => {
    const { user } = await createTestUser();
    const token = tokenFor(user);

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Updated",
        lastName: user.lastName,
        birthday: "1990-01-01",
        gender: "custom",
        email: user.email,
      });

    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe("Updated");
  });

  it("refuses to let one user edit another user's profile", async () => {
    const { user: owner } = await createTestUser();
    const { user: attacker } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${owner.id}`)
      .set("Authorization", `Bearer ${tokenFor(attacker)}`)
      .send({
        firstName: "Hijacked",
        lastName: owner.lastName,
        birthday: "1990-01-01",
        gender: "custom",
        email: owner.email,
      });

    expect(res.status).toBe(403);
  });

  it("rejects an incomplete update with 422", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ firstName: "" });

    expect(res.status).toBe(422);
  });

  it("uploads a new image via Cloudinary and stores its secure_url", async () => {
    const { user } = await createTestUser();

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .field("firstName", user.firstName)
      .field("lastName", user.lastName)
      .field("birthday", "1990-01-01")
      .field("gender", "custom")
      .field("email", user.email)
      .attach("image", pngBuffer, "avatar.png");

    expect(res.status).toBe(200);
    expect(res.body.user.image).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });

  it("cleans up the old Cloudinary image after a successful re-upload", async () => {
    const { user } = await createTestUser();
    const token = tokenFor(user);

    const first = await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .field("firstName", user.firstName)
      .field("lastName", user.lastName)
      .field("birthday", "1990-01-01")
      .field("gender", "custom")
      .field("email", user.email)
      .attach("image", pngBuffer, "avatar1.png");
    const firstPublicId = extractPublicId(first.body.user.image);

    destroyMock.mockClear();

    await request(app)
      .patch(`/api/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .field("firstName", user.firstName)
      .field("lastName", user.lastName)
      .field("birthday", "1990-01-01")
      .field("gender", "custom")
      .field("email", user.email)
      .attach("image", pngBuffer, "avatar2.png");

    expect(destroyMock).toHaveBeenCalledWith(firstPublicId);
  });

  it("rejects a disallowed file type instead of silently accepting it", async () => {
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

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
