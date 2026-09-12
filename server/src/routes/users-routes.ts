import express from "express";
import { validateBody } from "../middleware/validate-zod";
import { signupSchema, updateProfileSchema } from "../schemas/user-schemas";
import rateLimit from "express-rate-limit";

import * as usersController from "../controllers/users-controller";
import { upload, uploadToCloudinary } from "../middleware/file-upload";
import checkAuth from "../middleware/check-auth";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // max: 10,
  max: process.env.NODE_ENV === "test" ? 1000 : 10,   // ← changed
  message: { message: "Too many attempts, please try again later." },
});

router.get("/:uid", usersController.getUserById);

router.post(
  "/signup", 
  authLimiter, 
  [
    validateBody(signupSchema),
  ], 
  usersController.signup
);
router.post("/login", authLimiter, usersController.login);

// Everything below this line requires a valid token
router.use(checkAuth);

router.get("/", usersController.searchUsers);

router.patch(
  "/:uid",
  upload.single("image"),
  uploadToCloudinary,
  [
    validateBody(updateProfileSchema),
  ],
  usersController.updateProfile
);

export default router;