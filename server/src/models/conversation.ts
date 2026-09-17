import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IConversation extends Document {
  roomId: string;
  participants: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    roomId: { type: String, required: true, unique: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
  },
  { timestamps: true }
);

// Every conversation list is "give me all conversations this user is in" —
// this index keeps that fast as the collection grows.
conversationSchema.index({ participants: 1 });

const Conversation: Model<IConversation> = mongoose.model("Conversation", conversationSchema);

export default Conversation;
