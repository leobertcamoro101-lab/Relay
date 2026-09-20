import { describe, it, expect } from "vitest";
import { getDMRoomId, parseDMRoomId } from "../../src/util/dmRoom.js";

describe("getDMRoomId", () => {
  it("builds a deterministic room id regardless of argument order", () => {
    expect(getDMRoomId("user-a", "user-b")).toBe(getDMRoomId("user-b", "user-a"));
  });

  it("prefixes the room id with dm_", () => {
    expect(getDMRoomId("aaa", "bbb")).toMatch(/^dm_/);
  });
});

describe("parseDMRoomId", () => {
  it("round-trips with getDMRoomId", () => {
    const roomId = getDMRoomId("aaa111", "bbb222");
    const parsed = parseDMRoomId(roomId);
    expect(parsed).not.toBeNull();
    expect(parsed).toContain("aaa111");
    expect(parsed).toContain("bbb222");
  });

  it("returns null for a non-DM room name", () => {
    expect(parseDMRoomId("general")).toBeNull();
    expect(parseDMRoomId("random")).toBeNull();
  });

  it("returns null for a malformed dm_ room id", () => {
    expect(parseDMRoomId("dm_onlyone")).toBeNull();
    expect(parseDMRoomId("dm_")).toBeNull();
    expect(parseDMRoomId("dm_a_b_c")).toBeNull(); // three segments, not two
  });
});
