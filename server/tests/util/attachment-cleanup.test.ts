import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above normal consts, so the mocks must be
// created with vi.hoisted to be usable inside them.
const { destroy, exists } = vi.hoisted(() => ({ destroy: vi.fn(), exists: vi.fn() }));
vi.mock("../../src/config/cloudinary.js", () => ({ default: { uploader: { destroy } } }));
vi.mock("../../src/models/messages.js", () => ({ default: { exists } }));
vi.mock("../../src/util/logger.js", () => ({ default: { error: vi.fn() } }));

import { parseCloudinaryUrl, deleteAttachmentFile } from "../../src/util/attachment-cleanup.js";

const base = "https://res.cloudinary.com/democloud";

beforeEach(() => {
  destroy.mockReset();
  exists.mockReset();
  delete process.env.CLOUDINARY_CLOUD_NAME;
});

describe("parseCloudinaryUrl", () => {
  it("strips version and extension for images", () => {
    expect(parseCloudinaryUrl(`${base}/image/upload/v1700/relay/attachments/abc.png`)).toEqual({
      publicId: "relay/attachments/abc",
      resourceType: "image",
    });
  });
  it("keeps the extension for raw files", () => {
    expect(parseCloudinaryUrl(`${base}/raw/upload/v1700/relay/attachments/abc.docx`)).toEqual({
      publicId: "relay/attachments/abc.docx",
      resourceType: "raw",
    });
  });
  it("handles video", () => {
    expect(parseCloudinaryUrl(`${base}/video/upload/v1/relay/attachments/clip.mp4`)?.resourceType).toBe("video");
  });
  it("rejects anything outside relay/attachments (e.g. avatars)", () => {
    expect(parseCloudinaryUrl(`${base}/image/upload/v1/relay/avatar.png`)).toBeNull();
  });
  it("rejects other hosts and malformed urls", () => {
    expect(parseCloudinaryUrl("https://evil.com/image/upload/v1/relay/attachments/a.png")).toBeNull();
    expect(parseCloudinaryUrl("not a url")).toBeNull();
  });
  it("rejects a different cloud name when CLOUDINARY_CLOUD_NAME is set", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "mine";
    expect(parseCloudinaryUrl(`${base}/image/upload/v1/relay/attachments/a.png`)).toBeNull();
  });
});

describe("deleteAttachmentFile", () => {
  const url = `${base}/image/upload/v1/relay/attachments/abc.png`;

  it("destroys the asset when nothing else references it", async () => {
    exists.mockResolvedValue(null);
    await deleteAttachmentFile(url);
    expect(destroy).toHaveBeenCalledWith("relay/attachments/abc", { resource_type: "image", invalidate: true });
  });
  it("skips deletion while another message still uses the url", async () => {
    exists.mockResolvedValue({ _id: "x" });
    await deleteAttachmentFile(url);
    expect(destroy).not.toHaveBeenCalled();
  });
  it("never throws when Cloudinary fails", async () => {
    exists.mockResolvedValue(null);
    destroy.mockRejectedValue(new Error("boom"));
    await expect(deleteAttachmentFile(url)).resolves.toBeUndefined();
  });
  it("ignores missing urls", async () => {
    await deleteAttachmentFile(undefined);
    expect(destroy).not.toHaveBeenCalled();
  });
});
