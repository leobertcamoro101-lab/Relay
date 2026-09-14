import express from "express";
import checkAuth from "../middleware/check-auth.js";
import * as conversationsController from "../controllers/conversation-controller.js";

const router = express.Router();

router.use(checkAuth); // every conversation route requires a valid login

router.get("/", conversationsController.getMyConversations);
router.post("/", conversationsController.startConversation);

export default router;