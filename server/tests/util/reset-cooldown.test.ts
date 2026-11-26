import { describe, it, expect } from "vitest";
import { isResetCoolingDown, RESET_COOLDOWN_MS, RESET_TOKEN_TTL_MS } from "../../src/util/reset-cooldown.js";

const now = 1_700_000_000_000;
// a token issued `agoMs` ago expires TTL after it was issued
const expiresFor = (agoMs: number) => new Date(now - agoMs + RESET_TOKEN_TTL_MS);

describe("isResetCoolingDown", () => {
  it("is false when no reset was ever requested", () => {
    expect(isResetCoolingDown(undefined, now)).toBe(false);
    expect(isResetCoolingDown(null, now)).toBe(false);
  });

  it("is true right after a reset email was sent", () => {
    expect(isResetCoolingDown(expiresFor(5_000), now)).toBe(true);
  });

  it("is false once the cooldown has passed", () => {
    expect(isResetCoolingDown(expiresFor(RESET_COOLDOWN_MS + 1), now)).toBe(false);
  });

  it("is false for an old, expired token", () => {
    expect(isResetCoolingDown(expiresFor(2 * RESET_TOKEN_TTL_MS), now)).toBe(false);
  });

  it("accepts a timestamp number or string and ignores garbage", () => {
    expect(isResetCoolingDown(expiresFor(5_000).getTime(), now)).toBe(true);
    expect(isResetCoolingDown("not a date", now)).toBe(false);
  });
});
