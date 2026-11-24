import mongoose, { Schema, Model } from "mongoose";
import Message from "./messages.js";
import {
  PUBLIC_ROOMS,
  dmRoomPattern,
  buildUnreadSnapshot,
  type RoomLast,
  type UnreadSnapshot,
} from "../util/read-state.js";

// One document per (user, room): the last time that user had the room open.
// Anything from other people newer than this is "unread" for them.
interface IReadState {
  userId: string;
  room: string;
  lastReadAt: Date;
}

const readStateSchema = new Schema<IReadState>({
  userId: { type: String, required: true },
  room: { type: String, required: true, maxlength: 100 },
  lastReadAt: { type: Date, required: true },
});
readStateSchema.index({ userId: 1, room: 1 }, { unique: true });

const ReadState: Model<IReadState> = mongoose.model("ReadState", readStateSchema);

// Skip quietly when there's no database connection (e.g. the websocket
// integration tests, which never connect) instead of letting Mongoose queue
// the call for ten seconds and then fail.
const dbReady = () => mongoose.connection.readyState === 1;

// Best-effort: a failure here must never break chat, so it only logs.
export async function markRoomRead(userId: string, room: string, at: Date = new Date()): Promise<void> {
  if (!dbReady()) return;
  try {
    // $max so an older timestamp can never move the marker backwards.
    await ReadState.updateOne({ userId, room }, { $max: { lastReadAt: at } }, { upsert: true });
  } catch (err) {
    console.error("Failed to save read marker:", err);
  }
}

// Unread counts + newest-message times for every room this user can see:
// the public rooms plus their DMs.
export async function getUnreadSnapshot(userId: string, excludeRoom: string): Promise<UnreadSnapshot> {
  if (!dbReady()) return { unread: {}, activity: {} };

  const dm = dmRoomPattern(userId);
  const roomFilter = dm
    ? { $or: [{ room: { $in: PUBLIC_ROOMS } }, { room: dm }] }
    : { room: { $in: PUBLIC_ROOMS } };

  const [reads, lastDocs] = await Promise.all([
    ReadState.find({ userId }).lean(),
    Message.aggregate<{ _id: string; last: Date }>([
      { $match: roomFilter },
      { $group: { _id: "$room", last: { $max: "$createdAt" } } },
    ]),
  ]);

  const lastReadByRoom: Record<string, Date> = {};
  for (const r of reads) lastReadByRoom[r.room] = r.lastReadAt;
  const lasts: RoomLast[] = lastDocs.map((d) => ({ room: d._id, last: d.last }));

  return buildUnreadSnapshot({
    excludeRoom,
    lasts,
    lastReadByRoom,
    // Only other people's messages count; limit keeps it cheap in busy rooms.
    countSince: (room, since) =>
      Message.countDocuments(
        { room, userId: { $ne: userId }, createdAt: { $gt: since } },
        { limit: 100 },
      ),
  });
}

export default ReadState;
