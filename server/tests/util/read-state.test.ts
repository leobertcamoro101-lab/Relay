import { describe, it, expect, vi } from "vitest";
import { buildUnreadSnapshot, dmRoomPattern, MAX_UNREAD_COUNT } from "../../src/util/read-state.js";

const ME = "507f1f77bcf86cd799439011";
const OTHER = "507f1f77bcf86cd799439022";
const THIRD = "507f1f77bcf86cd799439033";
const START = new Date("2026-01-01T00:00:00Z");
const at = (iso: string) => new Date(iso);

describe("dmRoomPattern", () => {
  it("matches my DMs in either id order", () => {
    const p = dmRoomPattern(ME)!;
    expect(p.test(`dm_${ME}_${OTHER}`)).toBe(true);
    expect(p.test(`dm_${OTHER}_${ME}`)).toBe(true);
  });
  it("does not match other people's DMs or public rooms", () => {
    const p = dmRoomPattern(ME)!;
    expect(p.test(`dm_${OTHER}_${THIRD}`)).toBe(false);
    expect(p.test("general")).toBe(false);
    expect(p.test(`dm_${ME}`)).toBe(false);
  });
  it("returns null for anything that is not an ObjectId", () => {
    expect(dmRoomPattern("alice")).toBeNull();
    expect(dmRoomPattern(".*")).toBeNull();
  });
});

describe("buildUnreadSnapshot", () => {
  it("flags a room with messages newer than my last read", async () => {
    const countSince = vi.fn().mockResolvedValue(3);
    const snap = await buildUnreadSnapshot({
      excludeRoom: "general",
      lasts: [{ room: "tech", last: at("2026-02-02T00:00:00Z") }],
      lastReadByRoom: { tech: at("2026-02-01T00:00:00Z") },
      countSince,
      start: START,
    });
    expect(snap.unread).toEqual({ tech: 3 });
    expect(countSince).toHaveBeenCalledWith("tech", at("2026-02-01T00:00:00Z"));
  });

  it("is not unread when I read it after the last message", async () => {
    const countSince = vi.fn();
    const snap = await buildUnreadSnapshot({
      excludeRoom: "general",
      lasts: [{ room: "tech", last: at("2026-02-01T00:00:00Z") }],
      lastReadByRoom: { tech: at("2026-02-02T00:00:00Z") },
      countSince,
      start: START,
    });
    expect(snap.unread).toEqual({});
    expect(countSince).not.toHaveBeenCalled();
  });

  it("never counts the room I am in", async () => {
    const countSince = vi.fn().mockResolvedValue(5);
    const snap = await buildUnreadSnapshot({
      excludeRoom: "general",
      lasts: [{ room: "general", last: at("2026-02-02T00:00:00Z") }],
      lastReadByRoom: {},
      countSince,
      start: START,
    });
    expect(snap.unread).toEqual({});
    expect(snap.activity.general).toBe(at("2026-02-02T00:00:00Z").getTime()); // still sorts
  });

  it("treats a room with no read marker as read up to the feature start", async () => {
    const countSince = vi.fn().mockResolvedValue(2);
    const old = await buildUnreadSnapshot({
      excludeRoom: "general",
      lasts: [{ room: "random", last: at("2025-12-31T00:00:00Z") }], // before START
      lastReadByRoom: {},
      countSince,
      start: START,
    });
    expect(old.unread).toEqual({});

    const fresh = await buildUnreadSnapshot({
      excludeRoom: "general",
      lasts: [{ room: "random", last: at("2026-01-02T00:00:00Z") }], // after START
      lastReadByRoom: {},
      countSince,
      start: START,
    });
    expect(fresh.unread).toEqual({ random: 2 });
    expect(countSince).toHaveBeenLastCalledWith("random", START);
  });

  it("drops rooms where every newer message is my own (count 0)", async () => {
    const snap = await buildUnreadSnapshot({
      excludeRoom: "general",
      lasts: [{ room: "tech", last: at("2026-02-02T00:00:00Z") }],
      lastReadByRoom: { tech: at("2026-02-01T00:00:00Z") },
      countSince: async () => 0,
      start: START,
    });
    expect(snap.unread).toEqual({});
  });

  it("caps the count", async () => {
    const snap = await buildUnreadSnapshot({
      excludeRoom: "general",
      lasts: [{ room: "tech", last: at("2026-02-02T00:00:00Z") }],
      lastReadByRoom: {},
      countSince: async () => 5000,
      start: START,
    });
    expect(snap.unread.tech).toBe(MAX_UNREAD_COUNT);
  });

  it("reports activity for every room", async () => {
    const snap = await buildUnreadSnapshot({
      excludeRoom: "x",
      lasts: [
        { room: "tech", last: at("2026-02-02T00:00:00Z") },
        { room: "random", last: at("2026-03-02T00:00:00Z") },
      ],
      lastReadByRoom: {},
      countSince: async () => 0,
      start: START,
    });
    expect(snap.activity).toEqual({
      tech: at("2026-02-02T00:00:00Z").getTime(),
      random: at("2026-03-02T00:00:00Z").getTime(),
    });
  });
});
