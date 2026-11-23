import { describe, it, expect } from "vitest";
import { getUnreadRecipients } from "../../src/util/unread.js";

const canJoin = (room: string, userId: string) =>
  !room.startsWith("dm_") || room === "dm_alice_bob" && (userId === "alice" || userId === "bob");

const clients = [
  { userId: "alice", room: "general" },
  { userId: "bob", room: "tech" },
  { userId: "bob", room: "dm_alice_bob" },
  { userId: "carol", room: "random" },
];

describe("getUnreadRecipients", () => {
  it("pings everyone outside a public room except the sender", () => {
    const out = getUnreadRecipients(clients, "general", "alice", canJoin);
    expect(out.map((c) => c.userId)).toEqual(["bob", "bob", "carol"]);
  });

  it("does not ping people already in the room", () => {
    const out = getUnreadRecipients(clients, "tech", "alice", canJoin);
    expect(out.some((c) => c.room === "tech")).toBe(false);
  });

  it("only pings the other participant for a DM, and only if they are elsewhere", () => {
    const out = getUnreadRecipients(
      [{ userId: "bob", room: "general" }, { userId: "carol", room: "general" }],
      "dm_alice_bob", "alice", canJoin,
    );
    expect(out).toEqual([{ userId: "bob", room: "general" }]);
  });

  it("does not ping a participant who already has the DM open", () => {
    const out = getUnreadRecipients([{ userId: "bob", room: "dm_alice_bob" }], "dm_alice_bob", "alice", canJoin);
    expect(out).toEqual([]);
  });

  it("never pings the sender, even from another tab", () => {
    const out = getUnreadRecipients([{ userId: "alice", room: "tech" }], "general", "alice", canJoin);
    expect(out).toEqual([]);
  });
});
