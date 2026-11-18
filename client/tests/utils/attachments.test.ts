import { describe, it, expect } from "vitest";
import { formatFileSize, matchesAccept, validateFile } from "../../src/utils/attachments";

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

describe("formatFileSize", () => {
  it("uses B, KB and MB", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("matchesAccept", () => {
  it("matches MIME wildcards, exact types and extensions", () => {
    expect(matchesAccept(file("a.png", "image/png"), "image/*")).toBe(true);
    expect(matchesAccept(file("a.pdf", "application/pdf"), "application/pdf")).toBe(true);
    expect(matchesAccept(file("a.PDF", ""), ".pdf")).toBe(true); // empty type, uppercase ext
    expect(matchesAccept(file("a.exe", "application/x-msdownload"), "image/*,.pdf")).toBe(false);
  });
});

describe("validateFile", () => {
  it("returns null for an acceptable file", () => {
    expect(validateFile(file("a.png", "image/png"))).toBeNull();
  });
  it("rejects unsupported types", () => {
    expect(validateFile(file("a.exe", "application/x-msdownload"))).toMatch(/supported file type/);
  });
  it("rejects files over the limit", () => {
    expect(validateFile(file("a.png", "image/png", 2048), { maxBytes: 1024 })).toMatch(/larger than 1\.0 KB/);
  });
});
