// Pure helpers for "what is unread for this user?" — no database imports, so
// they can be unit-tested without Mongo. The queries live in
// models/read-state.ts.

// Public rooms. Keep in sync with ROOMS in client/src/pages/authenticated/Sidebar.tsx.
export const PUBLIC_ROOMS = ["general", "tech", "random"];

// Messages sent before this moment never count as unread for a room the user
// has no read marker for yet. Without it, the first deploy would flag every
// room's entire history as unread for everyone. A brand-new DM sent after this
// date still shows up as unread.
export const UNREAD_START = new Date("2026-11-23T08:00:00Z");

export const MAX_UNREAD_COUNT = 99;

const OBJECT_ID = "[0-9a-fA-F]{24}";

// Matches the DM rooms a user is part of ("dm_<idA>_<idB>", either order).
// Returns null for anything that isn't a plain ObjectId so a weird value can
// never be spliced into a regular expression.
export function dmRoomPattern(userId: string): RegExp | null {
  if (!new RegExp(`^${OBJECT_ID}$`).test(userId)) return null;
  return new RegExp(`^dm_(?:${userId}_${OBJECT_ID}|${OBJECT_ID}_${userId})$`);
}

export interface RoomLast {
  room: string;
  last: Date; // newest message in the room, from anyone
}

export interface UnreadSnapshot {
  unread: Record<string, number>;   // room -> unread count (only rooms > 0)
  activity: Record<string, number>; // room -> newest message time (ms)
}

// unread: rooms (other than the one the user is in) holding messages from
// other people newer than the user's last-read time for that room.
// activity: newest message time for every room, so the sidebar can sort by it.
// countSince(room, since) does the actual count (a DB query in production).
export async function buildUnreadSnapshot(opts: {
  excludeRoom: string;
  lasts: RoomLast[];
  lastReadByRoom: Record<string, Date | undefined>;
  countSince: (room: string, since: Date) => Promise<number>;
  start?: Date;
}): Promise<UnreadSnapshot> {
  const start = opts.start ?? UNREAD_START;
  const activity: Record<string, number> = {};
  const toCount: { room: string; since: Date }[] = [];

  for (const { room, last } of opts.lasts) {
    activity[room] = last.getTime();
    if (room === opts.excludeRoom) continue; // you're looking at it
    const since = opts.lastReadByRoom[room] ?? start;
    if (last.getTime() > since.getTime()) toCount.push({ room, since });
  }

  const counts = await Promise.all(toCount.map((r) => opts.countSince(r.room, r.since)));
  const unread: Record<string, number> = {};
  toCount.forEach((r, i) => {
    if (counts[i] > 0) unread[r.room] = Math.min(counts[i], MAX_UNREAD_COUNT);
  });
  return { unread, activity };
}
