import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, tokenFor } from "../helpers/factories.js";

// Regression test for the malformed-ObjectId finding: startConversation
// used to pass `otherUserId` straight into a Mongo query, so a bad id
// (wrong length/format) surfaced as an unhandled Mongoose CastError → a
// raw 500 instead of a clean 422.
describe("ObjectId validation", () => {
  it("rejects a malformed otherUserId with 422, not a 500", async () => {
    const { user: alice } = await createTestUser();
    const aliceToken = tokenFor(alice);

    const res = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ otherUserId: "not-a-valid-object-id" });

    expect(res.status).toBe(422);
  });

  it("rejects a missing otherUserId with 422", async () => {
    const { user: alice } = await createTestUser();
    const aliceToken = tokenFor(alice);

    const res = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it("accepts a well-formed, real otherUserId", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const aliceToken = tokenFor(alice);

    const res = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ otherUserId: bob.id });

    expect(res.status).toBe(200);
    expect(res.body.roomId).toBeTruthy();
  });
});
