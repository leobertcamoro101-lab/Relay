import express from "express";
import checkAuth from "../middleware/check-auth";
import * as conversationsController from "../controllers/conversation-controller";

const router = express.Router();

router.use(checkAuth); // every conversation route requires a valid login

router.get("/", conversationsController.getMyConversations);
router.post("/", conversationsController.startConversation);
router.delete("/:roomId", conversationsController.deleteConversation);

export default router;