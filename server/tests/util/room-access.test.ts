import { describe, it, expect } from "vitest";
import { canJoinRoom } from "../../src/state.js";

const alice = "a".repeat(24);
const bob = "b".repeat(24);
const carol = "c".repeat(24);

describe("canJoinRoom", () => {
  it("lets anyone join the fixed public rooms", () => {
    for (const room of ["general", "tech", "random"]) {
      expect(canJoinRoom(room, alice)).toBe(true);
    }
  });

  it("refuses made-up room names", () => {
    for (const room of ["admin", "secret", "General", "general ", "", "x".repeat(100)]) {
      expect(canJoinRoom(room, alice)).toBe(false);
    }
  });

  it("lets only the two participants into a DM room", () => {
    const room = `dm_${alice}_${bob}`;
    expect(canJoinRoom(room, alice)).toBe(true);
    expect(canJoinRoom(room, bob)).toBe(true);
    expect(canJoinRoom(room, carol)).toBe(false);
  });
});
