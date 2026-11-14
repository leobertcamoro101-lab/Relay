import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface IMessage extends Document {
  room: string;
  userId: string;
  username: string;
  text: string;
  edited: boolean;
  attachment?: IAttachment; // NEW
  createdAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true, maxlength: 2000 },
    name: { type: String, required: true, maxlength: 255 },
    type: { type: String, required: true, maxlength: 100 },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false } // just metadata alongside the message, no need for its own id
);

const messageSchema = new Schema<IMessage>(
  {
    room: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    // NEW — no longer required: a message can now be an attachment with no
    // caption at all. The WS handler (index.ts) still enforces that a
    // message has at least a text OR an attachment before it ever reaches
    // this model, so this relaxation doesn't allow a fully-empty message.
    text: { type: String, required: false, default: "", maxlength: 500 },
    edited: { type: Boolean, default: false },   // NEW
    attachment: { type: attachmentSchema, required: false }, // NEW
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
    attachment: m.attachment, // NEW — carries through on room history/rejoin too
  }));
}

export default Message;
