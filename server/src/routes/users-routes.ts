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

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // max: 5,
  max: process.env.NODE_ENV === "test" ? 1000 : 5,   // ← changed
  message: { message: "Too many password reset requests, please try again later." },
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
router.post("/forgot-password", forgotPasswordLimiter, usersController.forgotPassword);
router.post("/reset-password", authLimiter, usersController.resetPassword);
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
router.patch("/:uid/password", usersController.changePassword);

export default router;