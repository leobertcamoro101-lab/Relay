import { describe, it, expect } from "vitest";
import { REACTION_EMOJIS, isAllowedReaction, normalizeReactions } from "../../src/util/reactions.js";

describe("isAllowedReaction", () => {
  it("accepts every emoji in the allowlist", () => {
    for (const e of REACTION_EMOJIS) expect(isAllowedReaction(e)).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isAllowedReaction("💩")).toBe(false);
    expect(isAllowedReaction("$where")).toBe(false);
    expect(isAllowedReaction("")).toBe(false);
    expect(isAllowedReaction(undefined)).toBe(false);
    expect(isAllowedReaction(42)).toBe(false);
  });
});

describe("normalizeReactions", () => {
  it("drops emoji with no users left", () => {
    expect(normalizeReactions({ "👍": ["a"], "❤️": [] })).toEqual({ "👍": ["a"] });
  });
  it("ignores malformed values", () => {
    expect(normalizeReactions({ "👍": "a", "😂": [1, "b"] })).toEqual({ "😂": ["b"] });
  });
  it("returns an empty object for missing or non-object input", () => {
    expect(normalizeReactions(undefined)).toEqual({});
    expect(normalizeReactions(null)).toEqual({});
    expect(normalizeReactions("x")).toEqual({});
  });
});
