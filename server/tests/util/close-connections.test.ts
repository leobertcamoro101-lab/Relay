import { describe, it, expect, vi, afterEach } from "vitest";
import { joinRoom, leaveRoom, closeUserConnections, type ClientState } from "../../src/state.js";

const made: ClientState[] = [];
function fake(userId: string, room: string, id: string, closeImpl = vi.fn()): ClientState {
  const c = { ws: { close: closeImpl } as any, id, userId, username: userId, room };
  joinRoom(room, c);
  made.push(c);
  return c;
}

afterEach(() => {
  for (const c of made.splice(0)) leaveRoom(c.room, c.id);
});

describe("closeUserConnections", () => {
  it("closes every connection of that user, across rooms and tabs, with the given code", () => {
    const a1 = fake("alice", "general", "c1");
    const a2 = fake("alice", "general", "c2"); // second tab
    const a3 = fake("alice", "tech", "c3");
    const closed = closeUserConnections("alice", 4001, "Password changed");

    expect(closed).toBe(3);
    for (const c of [a1, a2, a3]) expect(c.ws.close).toHaveBeenCalledWith(4001, "Password changed");
  });

  it("leaves other users' connections alone", () => {
    const alice = fake("alice", "general", "c1");
    const bob = fake("bob", "general", "c2");
    closeUserConnections("alice");

    expect(alice.ws.close).toHaveBeenCalledTimes(1);
    expect(bob.ws.close).not.toHaveBeenCalled();
  });

  it("returns 0 when the user has no open connection", () => {
    expect(closeUserConnections("nobody")).toBe(0);
  });

  it("keeps going if one socket throws on close", () => {
    fake("alice", "general", "c1", vi.fn(() => { throw new Error("already closed"); }));
    const ok = fake("alice", "general", "c2");

    expect(() => closeUserConnections("alice")).not.toThrow();
    expect(ok.ws.close).toHaveBeenCalled();
  });
});
