import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  joinRoom,
  leaveRoom,
  getRoomMembers,
  getRoomUsers,
  getRoomOnlineCount,
  canJoinRoom,
  type ClientState,
} from "../../src/state.js";

// Direct, DB-free unit tests for the room-membership bookkeeping in
// state.ts. This is the exact module where the duplicate-online-users bug
// lived (getRoomUsers/getRoomOnlineCount not deduping by userId despite a
// comment claiming they did) — these tests pin that behavior down at the
// source, separate from the end-to-end WebSocket regression test in
// tests/websocket/chat.test.ts.

function fakeClient(overrides: Partial<ClientState> = {}): ClientState {
  return {
    ws: {} as ClientState["ws"], // never actually sent to in these tests
    id: overrides.id ?? randomUUID(),
    userId: overrides.userId ?? "user-1",
    username: overrides.username ?? "Alice",
    room: overrides.room ?? "general",
  };
}

describe("state — room membership", () => {
  it("returns one entry per connection from getRoomMembers", () => {
    const room = `room-${randomUUID()}`;
    joinRoom(room, fakeClient({ room, id: "conn-1" }));
    joinRoom(room, fakeClient({ room, id: "conn-2" }));

    expect(getRoomMembers(room)).toHaveLength(2);
  });

  it("dedupes the same userId across multiple connections in getRoomUsers/getRoomOnlineCount", () => {
    const room = `room-${randomUUID()}`;
    // Same real person, two tabs — two connection ids, one userId.
    joinRoom(room, fakeClient({ room, id: "tab-1", userId: "alice", username: "Alice" }));
    joinRoom(room, fakeClient({ room, id: "tab-2", userId: "alice", username: "Alice" }));

    expect(getRoomMembers(room)).toHaveLength(2); // both connections still tracked
    expect(getRoomUsers(room)).toHaveLength(1); // but one real person
    expect(getRoomOnlineCount(room)).toBe(1);
  });

  it("only drops a user from the room once every one of their connections has left", () => {
    const room = `room-${randomUUID()}`;
    joinRoom(room, fakeClient({ room, id: "tab-1", userId: "alice" }));
    joinRoom(room, fakeClient({ room, id: "tab-2", userId: "alice" }));

    leaveRoom(room, "tab-1");
    expect(getRoomOnlineCount(room)).toBe(1); // still online via tab-2

    leaveRoom(room, "tab-2");
    expect(getRoomOnlineCount(room)).toBe(0);
    expect(getRoomMembers(room)).toHaveLength(0);
  });

  it("leaveRoom on an unknown room or connection id is a no-op, not a crash", () => {
    expect(() => leaveRoom("never-joined-room", "no-such-conn")).not.toThrow();
  });

  it("canJoinRoom allows anyone into a non-DM room", () => {
    expect(canJoinRoom("general", "anyone")).toBe(true);
    expect(canJoinRoom("random", "anyone-else")).toBe(true);
  });

  it("canJoinRoom only allows the two participants into a DM room", () => {
    expect(canJoinRoom("dm_alice_bob", "alice")).toBe(true);
    expect(canJoinRoom("dm_alice_bob", "bob")).toBe(true);
    expect(canJoinRoom("dm_alice_bob", "mallory")).toBe(false);
  });
});
