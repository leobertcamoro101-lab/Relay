import mongoose from "mongoose";

// A reply stores a small snapshot of the message it quotes, not just its id.
// That way the quote still renders after the original is edited or deleted
// (the same trade-off most chat apps make).
export interface ReplySnapshot {
  id: string;
  username: string;
  text: string; // truncated
  attachmentName?: string;
}

export const REPLY_PREVIEW_MAX = 100;

export function isValidMessageId(id: unknown): id is string {
  return typeof id === "string" && mongoose.isValidObjectId(id);
}

export function truncatePreview(text: string, max = REPLY_PREVIEW_MAX): string {
  const t = (text ?? "").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

// Builds the snapshot from the quoted message document (already confirmed to
// be in the same room by the caller).
export function buildReplySnapshot(original: {
  _id: unknown;
  username: string;
  text?: string;
  attachment?: { name?: string } | null;
}): ReplySnapshot {
  const snap: ReplySnapshot = {
    id: String(original._id),
    username: original.username,
    text: truncatePreview(original.text ?? ""),
  };
  if (original.attachment?.name) snap.attachmentName = original.attachment.name;
  return snap;
}
