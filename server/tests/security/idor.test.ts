import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, tokenFor } from "../helpers/factories.js";

// Focused IDOR pass over the conversations API: every id-taking endpoint
// must scope its result to the requesting user rather than trusting
// whatever id is in the URL/body.
describe("IDOR — conversations", () => {
  it("only ever lists conversations the requester is a participant in", async () => {
    const { user: alice } = await createTestUser();
    const { user: bob } = await createTestUser();
    const { user: carol } = await createTestUser();
    const aliceToken = tokenFor(alice);
    const carolToken = tokenFor(carol);

    // Alice <-> Bob conversation exists, but Carol has none.
    await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ otherUserId: bob.id })
      .expect(200);

    const aliceList = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(aliceList.status).toBe(200);
    expect(aliceList.body.conversations).toHaveLength(1);
    expect(aliceList.body.conversations[0].otherUser.id).toBe(String(bob._id));

    const carolList = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${carolToken}`);
    expect(carolList.status).toBe(200);
    expect(carolList.body.conversations).toHaveLength(0);
  });

  it("refuses to start a conversation with yourself", async () => {
    const { user: alice } = await createTestUser();
    const aliceToken = tokenFor(alice);

    const res = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ otherUserId: alice.id });

    expect(res.status).toBe(422);
  });

  it("requires authentication for every conversations route", async () => {
    const listRes = await request(app).get("/api/conversations");
    const postRes = await request(app).post("/api/conversations").send({ otherUserId: "x" });
    const deleteRes = await request(app).delete("/api/conversations/dm_a_b");

    expect(listRes.status).toBe(403);
    expect(postRes.status).toBe(403);
    expect(deleteRes.status).toBe(403);
  });
});
