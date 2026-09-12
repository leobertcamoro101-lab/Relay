import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  roomId: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    roomId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Conversation: Model<IConversation> = mongoose.model("Conversation", conversationSchema);

export default Conversation;