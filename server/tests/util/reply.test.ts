import { describe, it, expect } from "vitest";
import { buildReplySnapshot, isValidMessageId, truncatePreview, REPLY_PREVIEW_MAX } from "../../src/util/reply.js";

describe("isValidMessageId", () => {
  it("accepts a 24-char hex ObjectId", () => {
    expect(isValidMessageId("507f1f77bcf86cd799439011")).toBe(true);
  });
  it("rejects junk and non-strings", () => {
    expect(isValidMessageId("nope")).toBe(false);
    expect(isValidMessageId(undefined)).toBe(false);
    expect(isValidMessageId({ $ne: "x" })).toBe(false);
  });
});

describe("truncatePreview", () => {
  it("leaves short text alone", () => {
    expect(truncatePreview("  hi  ")).toBe("hi");
  });
  it("truncates long text with an ellipsis", () => {
    const out = truncatePreview("a".repeat(300));
    expect(out.length).toBe(REPLY_PREVIEW_MAX);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("buildReplySnapshot", () => {
  it("snapshots id, username and text", () => {
    expect(buildReplySnapshot({ _id: "abc", username: "ann", text: "hello" })).toEqual({
      id: "abc", username: "ann", text: "hello",
    });
  });
  it("includes the attachment name when present", () => {
    const snap = buildReplySnapshot({ _id: "abc", username: "ann", text: "", attachment: { name: "cat.png" } });
    expect(snap.attachmentName).toBe("cat.png");
    expect(snap.text).toBe("");
  });
});
