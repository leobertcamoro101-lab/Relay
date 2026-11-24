import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLastRoom, saveLastRoom, clearLastRoom } from "../../src/utils/lastRoom";

beforeEach(() => sessionStorage.clear());

describe("lastRoom", () => {
  it("returns null when nothing is saved", () => {
    expect(getLastRoom()).toBeNull();
  });

  it("saves and reads back a room", () => {
    saveLastRoom("tech");
    expect(getLastRoom()).toBe("tech");
  });

  it("clears the saved room", () => {
    saveLastRoom("tech");
    clearLastRoom();
    expect(getLastRoom()).toBeNull();
  });

  it("ignores an absurdly long value", () => {
    sessionStorage.setItem("relay:lastRoom", "x".repeat(101));
    expect(getLastRoom()).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getLastRoom()).toBeNull();
    spy.mockRestore();
  });
});
