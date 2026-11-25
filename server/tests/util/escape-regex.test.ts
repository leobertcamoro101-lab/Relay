import { describe, it, expect } from "vitest";
import { escapeRegex } from "../../src/util/escape-regex.js";

describe("escapeRegex", () => {
  it("leaves plain text alone", () => {
    expect(escapeRegex("Alan Elliott")).toBe("Alan Elliott");
  });

  it("escapes every regex metacharacter so the input only matches itself", () => {
    for (const input of [".*", "^a", "a$", "(a+)+$", "[a-z]", "a|b", "a\\b", "x{1,9}", "a?b"]) {
      const re = new RegExp(escapeRegex(input));
      expect(re.test(input)).toBe(true);
    }
  });

  it("no longer matches things the raw pattern would", () => {
    expect(new RegExp(escapeRegex(".*")).test("anything")).toBe(false);
    expect(new RegExp(escapeRegex("^a")).test("alan")).toBe(false);
  });
});
