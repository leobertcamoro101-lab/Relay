import { describe, it, expect } from "vitest";
import { cleanString } from "../../src/util/clean-string.js";

describe("cleanString", () => {
  it("trims and caps a normal string", () => {
    expect(cleanString("  hello  ", 10)).toBe("hello");
    expect(cleanString("abcdef", 3)).toBe("abc");
  });

  it.each([5, null, undefined, true, {}, [], { trim: "x" }, ["a"]])(
    "returns an empty string instead of throwing for %j",
    (bad) => {
      expect(cleanString(bad, 10)).toBe("");
    },
  );
});
