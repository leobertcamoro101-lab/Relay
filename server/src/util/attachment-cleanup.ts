import cloudinary from "../config/cloudinary.js";
import logger from "./logger.js";
import Message from "../models/messages.js";

// Attachments are stored as a Cloudinary delivery URL only (no public_id),
// so to delete one we derive the public_id + resource type back out of the
// URL, e.g.
//   https://res.cloudinary.com/<cloud>/image/upload/v169/relay/attachments/abc.png
//     -> resourceType "image", publicId "relay/attachments/abc"
//   .../raw/upload/v169/relay/attachments/abc.docx
//     -> resourceType "raw",   publicId "relay/attachments/abc.docx"
// (images/videos drop the extension from the public_id, raw files keep it.)

const ATTACHMENT_FOLDER = "relay/attachments/";

export interface ParsedCloudinaryAsset {
  publicId: string;
  resourceType: "image" | "video" | "raw";
}

export function parseCloudinaryUrl(url: string): ParsedCloudinaryAsset | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  // [cloudName, resourceType, "upload", (transformations?), (v123)?, ...publicId]
  if (parts.length < 4 || parts[2] !== "upload") return null;

  const [cloudName, resourceType] = parts;
  const expectedCloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (expectedCloud && cloudName !== expectedCloud) return null; // not our account
  if (resourceType !== "image" && resourceType !== "video" && resourceType !== "raw") return null;

  const versionIdx = parts.findIndex((p, i) => i >= 3 && /^v\d+$/.test(p));
  const idParts = parts.slice(versionIdx === -1 ? 3 : versionIdx + 1);
  if (idParts.length === 0) return null;

  let publicId: string;
  try {
    publicId = decodeURIComponent(idParts.join("/"));
  } catch {
    return null;
  }
  if (resourceType !== "raw") publicId = publicId.replace(/\.[^/.]+$/, "");

  // Only ever touch files this feature created — never avatars or anything
  // else in the account, whatever URL a client managed to put on a message.
  if (!publicId.startsWith(ATTACHMENT_FOLDER)) return null;

  return { publicId, resourceType };
}

// Deletes the Cloudinary file behind an attachment URL. Best-effort: never
// throws (a failed cleanup must not fail the edit/delete the user asked
// for), logs instead. Skips the delete if any message still references the
// same URL — `sanitizeAttachment` validates shape, not origin, so a client
// could otherwise point its own message at someone else's file and then
// "remove" it to destroy theirs.
export async function deleteAttachmentFile(url: string | undefined | null): Promise<void> {
  if (!url) return;
  const asset = parseCloudinaryUrl(url);
  if (!asset) return;

  try {
    if (await Message.exists({ "attachment.url": url })) return;
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      invalidate: true,
    });
  } catch (err) {
    logger.error({ err, publicId: asset.publicId }, "Failed to delete orphaned attachment");
  }
}
