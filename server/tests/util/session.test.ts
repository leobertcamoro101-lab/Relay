import { describe, it, expect } from "vitest";
import { passwordVersion, isSessionCurrent } from "../../src/util/session.js";

describe("passwordVersion", () => {
  it("is stable for the same hash and different for another", () => {
    expect(passwordVersion("hash-a")).toBe(passwordVersion("hash-a"));
    expect(passwordVersion("hash-a")).not.toBe(passwordVersion("hash-b"));
  });
  it("is short and does not contain the hash", () => {
    const pv = passwordVersion("$2a$12$abcdefghijklmnopqrstuv");
    expect(pv).toHaveLength(16);
    expect(pv).toMatch(/^[0-9a-f]+$/);
  });
});

describe("isSessionCurrent", () => {
  it("accepts a token made for the current password", () => {
    expect(isSessionCurrent(passwordVersion("hash-a"), "hash-a")).toBe(true);
  });
  it("rejects a token made before the password changed", () => {
    expect(isSessionCurrent(passwordVersion("old-hash"), "new-hash")).toBe(false);
  });
  it("accepts a legacy token with no pv claim", () => {
    expect(isSessionCurrent(undefined, "hash-a")).toBe(true);
  });
  it("rejects a pv claim that is not a string", () => {
    expect(isSessionCurrent(123, "hash-a")).toBe(false);
    expect(isSessionCurrent(null, "hash-a")).toBe(false);
    expect(isSessionCurrent({}, "hash-a")).toBe(false);
  });
});
