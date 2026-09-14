import { Response, NextFunction } from "express";
import Conversation from "../models/conversation.js";
import HttpError from "../models/http-error.js";
import { AuthRequest } from "../middleware/check-auth.js";
import { getDMRoomId } from "../util/dmRoom.js";
import logger from "../util/logger.js";

const startConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const myId = req.userData?.userId;
  const { otherUserId } = req.body;

  if (!myId || !otherUserId || otherUserId === myId) {
    return next(new HttpError("Invalid conversation request.", 422));
  }

  const roomId = getDMRoomId(myId, otherUserId);

  let conversation;
  try {
    // upsert: create it if it's new, just return it if it already exists
    conversation = await Conversation.findOneAndUpdate(
      { roomId },
      { roomId, participants: [myId, otherUserId] },
    //{ upsert: true, new: true, setDefaultsOnInsert: true }
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  } catch (err) {
    logger.error({ err }, "Start conversation failed");
    return next(new HttpError("Could not start conversation.", 500));
  }

  res.json({ roomId: conversation.roomId });
};

const getMyConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const myId = req.userData?.userId;

  let conversations;
  try {
    conversations = await Conversation.find({ participants: myId })
      .populate("participants", "firstName lastName image")
      .sort({ updatedAt: -1 });
  } catch (err) {
    logger.error({ err }, "Get my conversations failed");
    return next(new HttpError("Could not fetch conversations.", 500));
  }

  const result = conversations.map((c: any) => {
    const other = (c.participants as any[]).find((p) => p._id.toString() !== myId);
    return {
      roomId: c.roomId,
      otherUser: other
        ? { id: other._id, firstName: other.firstName, lastName: other.lastName, image: other.image }
        : null,
    };
  });

  res.json({ conversations: result });
};

export { startConversation, getMyConversations };