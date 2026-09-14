import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  room: string;
  userId: string;
  username: string;
  text: string;
  edited: boolean;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    room: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
    edited: { type: Boolean, default: false },   // NEW
  },
  { timestamps: true }
);

// Every query this collection runs is "give me a room's most recent
// messages" — this compound index keeps that fast as history grows.
messageSchema.index({ room: 1, createdAt: 1 });

const Message: Model<IMessage> = mongoose.model("Message", messageSchema);

export async function getRecentMessages(room: string, limit = 50) {
  const docs = await Message.find({ room })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // .sort(-1).limit(N) gets you the N most recent, newest-first —
  // reverse() puts them back in chronological order for display.
  return docs.reverse().map((m) => ({
    type: 'MESSAGE' as const,   // NEW — matches ChatMessageOut's discriminant
    id: String(m._id),
    userId: m.userId,
    username: m.username,
    text: m.text,
    timestamp: m.createdAt.getTime(),
    edited: m.edited,
  }));
}

export default Message;