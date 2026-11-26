import express from "express";
import checkAuth from "../middleware/check-auth.js";
import { uploadAttachmentFile, pipeAttachmentToCloudinary } from "../middleware/file-upload.js";
import { uploadLimiter } from "../middleware/rate-limits.js";
import { uploadAttachment } from "../controllers/upload-controller.js";

const router = express.Router();

// Mounted at /api/upload in app.ts, so this route resolves to
// POST /api/upload — matching MessageInput.tsx's
// `${VITE_BACKEND_URL}/upload` call exactly.
router.post(
  "/",
  checkAuth,
  uploadLimiter,
  uploadAttachmentFile.single("file"),
  pipeAttachmentToCloudinary,
  uploadAttachment
);

export default router;
