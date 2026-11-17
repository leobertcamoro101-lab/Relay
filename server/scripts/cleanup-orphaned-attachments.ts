// One-off cleanup: finds files in Cloudinary's relay/attachments/ folder that
// no message references anymore and (optionally) deletes them.
//
//   npx tsx scripts/cleanup-orphaned-attachments.ts            # dry run — lists only
//   npx tsx scripts/cleanup-orphaned-attachments.ts --delete   # actually deletes
//
// Reads the same .env as the server (Mongo + CLOUDINARY_* vars), so run it
// from the server/ folder. Safe by default: nothing is deleted without
// --delete, only relay/attachments/ is ever scanned, and files uploaded in
// the last hour are skipped (they may be mid-send and not on a message yet).
import "dotenv/config";
import mongoose from "mongoose";
import cloudinary from "../src/config/cloudinary.js";
import { connectDB } from "../src/db.js";
import Message from "../src/models/messages.js";
import { parseCloudinaryUrl } from "../src/util/attachment-cleanup.js";

const PREFIX = "relay/attachments/";
const GRACE_MS = 60 * 60 * 1000;
const RESOURCE_TYPES = ["image", "video", "raw"] as const;
const doDelete = process.argv.includes("--delete");

async function main() {
  await connectDB();

  // 1. Everything a message still points at, as "resourceType:publicId".
  const referenced = new Set<string>();
  const messages = await Message.find({ "attachment.url": { $exists: true } })
    .select("attachment.url")
    .lean();
  for (const m of messages) {
    const asset = m.attachment?.url ? parseCloudinaryUrl(m.attachment.url) : null;
    if (asset) referenced.add(`${asset.resourceType}:${asset.publicId}`);
  }
  console.log(`Messages with attachments: ${messages.length} (${referenced.size} distinct files)`);

  // 2. Everything Cloudinary actually has in the folder.
  const orphans: { resourceType: (typeof RESOURCE_TYPES)[number]; publicId: string; bytes: number }[] = [];
  let scanned = 0;
  let skippedRecent = 0;

  for (const resourceType of RESOURCE_TYPES) {
    let cursor: string | undefined;
    do {
      const page: any = await cloudinary.api.resources({
        type: "upload",
        resource_type: resourceType,
        prefix: PREFIX,
        max_results: 500,
        next_cursor: cursor,
      });
      for (const r of page.resources ?? []) {
        scanned++;
        if (referenced.has(`${resourceType}:${r.public_id}`)) continue;
        if (Date.now() - new Date(r.created_at).getTime() < GRACE_MS) {
          skippedRecent++;
          continue;
        }
        orphans.push({ resourceType, publicId: r.public_id, bytes: r.bytes ?? 0 });
      }
      cursor = page.next_cursor;
    } while (cursor);
  }

  const totalMB = orphans.reduce((n, o) => n + o.bytes, 0) / (1024 * 1024);
  console.log(`Scanned ${scanned} files in ${PREFIX}; skipped ${skippedRecent} uploaded in the last hour.`);
  console.log(`Orphaned: ${orphans.length} files (${totalMB.toFixed(2)} MB)`);
  for (const o of orphans) console.log(`  [${o.resourceType}] ${o.publicId}`);

  if (!doDelete) {
    console.log("\nDry run — nothing deleted. Re-run with --delete to remove the files above.");
    return;
  }

  let deleted = 0;
  for (const o of orphans) {
    try {
      await cloudinary.uploader.destroy(o.publicId, { resource_type: o.resourceType, invalidate: true });
      deleted++;
    } catch (err) {
      console.error(`Failed to delete ${o.publicId}:`, err);
    }
  }
  console.log(`\nDeleted ${deleted}/${orphans.length} files.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
