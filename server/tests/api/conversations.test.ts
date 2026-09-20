import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, tokenFor } from "../helpers/factories.js";

describe("conversations API", () => {
  it("creates a DM conversation and is idempotent on repeat calls", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const aliceToken = tokenFor(alice);

    const first = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ otherUserId: bob.id });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ otherUserId: bob.id });
    expect(second.status).toBe(200);

    expect(second.body.roomId).toBe(first.body.roomId);
  });

  it("returns the same roomId regardless of who starts the conversation", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();

    const fromAlice = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ otherUserId: bob.id });

    const fromBob = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${tokenFor(bob)}`)
      .send({ otherUserId: alice.id });

    expect(fromBob.body.roomId).toBe(fromAlice.body.roomId);
  });

  it("lets a participant delete the conversation", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const aliceToken = tokenFor(alice);

    const created = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ otherUserId: bob.id });

    const del = await request(app)
      .delete(`/api/conversations/${created.body.roomId}`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(del.status).toBe(200);

    const list = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(list.body.conversations).toHaveLength(0);
  });

  it("refuses to let a non-participant delete someone else's conversation", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const { user: mallory } = await createTestUser();

    const created = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${tokenFor(alice)}`)
      .send({ otherUserId: bob.id });

    const del = await request(app)
      .delete(`/api/conversations/${created.body.roomId}`)
      .set("Authorization", `Bearer ${tokenFor(mallory)}`);

    expect(del.status).toBe(403);
  });

  it("404s deleting a conversation that doesn't exist", async () => {
    const { user: alice } = await createTestUser();

    const res = await request(app)
      .delete("/api/conversations/dm_doesnotexist_atall")
      .set("Authorization", `Bearer ${tokenFor(alice)}`);

    expect(res.status).toBe(404);
  });
});
