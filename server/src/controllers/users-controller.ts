import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto';

import sendResetPasswordEmail from "../util/brevo-email.js";
import { deleteCloudinaryImage, extractPublicId } from "../util/cloudinary-cleanup.js";
import HttpError from "../models/http-error.js";
import logger from "../util/logger.js";
import { escapeRegex } from "../util/escape-regex.js";
import { passwordVersion } from "../util/session.js";
import { isResetCoolingDown, RESET_TOKEN_TTL_MS } from "../util/reset-cooldown.js";
import User from "../models/user.js";
import { closeUserConnections } from "../state.js";
import { AuthRequest } from "../middleware/check-auth.js";

// A bcrypt hash for a password nobody actually has. Used to burn the same
// amount of time as a real bcrypt.compare() when no matching user is
// found, so login's response time doesn't reveal whether an email is
// registered — without this, "no such user" returns instantly while
// "wrong password" waits ~100ms for bcrypt, which is a timing side-channel.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", 12);

const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.params.uid;

  // security check: same pattern you already use in updateProfile
  if (req.userData?.userId !== userId) {
    return next(new HttpError("You are not allowed to view this profile.", 403));
  }

  let user;
  try {
    user = await User.findById(userId).select("-password -resetPasswordToken -resetPasswordExpires");
  } catch (err) {
    logger.error({ err }, "Get user by id failed");
    return next(new HttpError("Something went wrong, could not fetch profile.", 500));
  }

  if (!user) {
    return next(new HttpError("Could not find user.", 404));
  }

  res.json({ user: user.toObject({ getters: true }) });
};

const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // ?q= can arrive as an array or object (?q[a]=1), so only accept a string;
  // cap the length so a huge pattern can't be used to slow the query down.
  const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
  const query = rawQuery.trim().slice(0, 50);
  if (!query) {
    return res.json({ users: [] });
  }
  // User input is matched as plain text, never as a regular expression.
  const pattern = escapeRegex(query);

  let users;
  try {
    users = await User.find({
      _id: { $ne: req.userData?.userId }, // don't return yourself
      $or: [
        { firstName: { $regex: pattern, $options: "i" } },
        { lastName: { $regex: pattern, $options: "i" } },
        { email: { $regex: pattern, $options: "i" } },
      ],
    })
      // Only what the people-picker shows. Never email, birthday, gender or
      // the reset-token fields of other users.
      .select("firstName lastName image")
      .limit(10);
  } catch (err) {
    logger.error({ err }, "Search users failed");
    return next(new HttpError("Something went wrong, could not search users.", 500));
  }

  res.json({ users: users.map((u: any) => u.toObject({ getters: true })) });
};

const signup = async (req: AuthRequest, res: Response, next: NextFunction) => {

  if (req.validationError) {
    
    return next(new HttpError("Invalid inputs passed, please check your data.", 422));
  }

  const { firstName, lastName, birthday, gender, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    logger.error({ err }, "signup failed");
    return next(new HttpError("Signing up failed, please try again later.", 500));
  }

  if (existingUser) {
    
    return next(new HttpError("User exists already, please login instead", 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    logger.error({ err }, "signup failed"); 
    return next(new HttpError("Could not create user, please try again", 500));
  }

  const createdUser = new User({
    firstName,
    lastName,
    birthday,
    gender,
    email,
    password: hashedPassword,
    // places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    
    logger.error({ err }, "signup failed");
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email, pv: passwordVersion(hashedPassword) },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" }
    );
  } catch (err) {
    logger.error({ err }, "signup failed");
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  logger.info({ userId: createdUser.id, email: createdUser.email }, "User signed up");

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
    image: createdUser.image,
    token,
    // name: createdUser.firstName + ' ' + createdUser.lastName,
  });
};

const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    logger.error({ err }, "login failed");
    return next(new HttpError("Logging in failed, please try again later.", 500));
  }

  // Compare against the real hash if the user exists, or the dummy hash if
  // not — either way bcrypt.compare() runs, so timing doesn't leak which
  // case we're in.
  const passwordToCompare = existingUser ? existingUser.password : DUMMY_PASSWORD_HASH;

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, passwordToCompare);
  } catch (err) {
    logger.error({ err }, "login failed");
    return next(new HttpError("Could not log you in please check credentials and try again", 500));
  }

  if (!existingUser || !isValidPassword) {
    return next(new HttpError("Invalid credentials, could not log you in", 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email, pv: passwordVersion(existingUser.password) },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" }
    );
  } catch (err) {
    logger.error({ err }, "login failed");
    return next(new HttpError("Logging in failed, please try again.", 500));
  }

  logger.info({ userId: existingUser.id, email: existingUser.email }, "User logged in");

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    image: existingUser.image,
    token,
  });
};

const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { email } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    logger.error({ err }, "Forgot Password failed"); 
    return next(new HttpError("Something went wrong, please try again later.", 500));
  }

  // Always respond the same way, whether or not the email exists —
  // this prevents leaking which emails are registered in your system
  if (!existingUser) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  // A reset email went out to this account moments ago: answer the same way
  // but don't send (or replace the token with) another one.
  if (isResetCoolingDown(existingUser.resetPasswordExpires)) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  existingUser.resetPasswordToken = hashedToken;
  existingUser.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  try {
    await existingUser.save();
    await sendResetPasswordEmail(existingUser.email, rawToken);
  } catch (err) {
    logger.error({ err }, "Forgot Password failed");
    return next(new HttpError("Could not send reset email, please try again.", 500));
  }

  logger.info({ userId: existingUser.id, email: existingUser.email }, "Password reset requested");
  res.json({ message: "If that email exists, a reset link has been sent." });
};

const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Validation error
  if (req.validationError) {
    return next(new HttpError("Invalid inputs passed, please check your data.", 422));
  }
  const { token, password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  let existingUser;
  try {
    existingUser = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
  } catch (err) {
    logger.error({ err }, "Reset Password failed");
    return next(new HttpError("Something went wrong, please try again later.", 500));
  }

  if (!existingUser) {
    return next(new HttpError("Reset link is invalid or has expired.", 400));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    logger.error({ err }, "Reset Password failed"); 
    return next(new HttpError("Could not reset password, please try again.", 500));
  }

  existingUser.password = hashedPassword;
  existingUser.resetPasswordToken = undefined;
  existingUser.resetPasswordExpires = undefined;

  try {
    await existingUser.save();
  } catch (err) {
    logger.error({ err }, "Reset Password failed");
    return next(new HttpError("Could not reset password, please try again.", 500));
  }

  closeUserConnections(existingUser.id, 4001, "Password changed");
  logger.info({ userId: existingUser.id }, "Password reset completed");
  res.json({ message: "Password has been reset successfully." });
};

const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {

  if (req.validationError) {
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("Invalid inputs passed, please check your data.", 422));
  }

  const userId = req.params.uid;
// security check: ensure the user making the request is the same as the user being updated
  if (req.userData?.userId !== userId) {
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("You are not allowed to edit this profile.", 403));
  }

  const { firstName, lastName, birthday, gender, email } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    logger.error({ err }, "Update profile failed"); 
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("Something went wrong, could not update profile.", 500));
  }

  if (!user) {
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("Could not find user.", 404));
  }

  if (email && email !== user.email) {
    // The email is how a lost password gets reset, so changing it needs the
    // current password. Otherwise a stolen login token could swap the email and
    // then take the account over for good through "forgot password". Checked
    // before the "already in use" lookup so it can't be used to probe emails.
    let passwordOk = false;
    if (req.currentPassword) {
      try {
        passwordOk = await bcrypt.compare(req.currentPassword, user.password);
      } catch (err) {
        logger.error({ err }, "Update profile failed");
      }
    }
    if (!passwordOk) {
      await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
      return next(new HttpError("Enter your current password to change your email.", 401));
    }

    let existingEmailUser;
    try {
      existingEmailUser = await User.findOne({ email });
    } catch (err) {
      logger.error({ err }, "Update profile failed");
      await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
      return next(new HttpError("Something went wrong, could not update profile.", 500));
    }
    if (existingEmailUser) {
      await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
      return next(new HttpError("That email is already in use.", 422));
    }
  }

  const oldImagePublicId = req.file ? extractPublicId(user.image) : null;

  user.firstName = firstName;
  user.lastName = lastName;
  user.birthday = birthday;
  user.gender = gender;
  user.email = email;
  if (req.file && req.file.cloudinaryUrl) {
    user.image = req.file.cloudinaryUrl;
  }

  try {
    await user.save();
  } catch (err) {
    logger.error({ err }, "Update profile failed");
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("Updating profile failed, please try again.", 500));
  }

  if (oldImagePublicId) {
    await deleteCloudinaryImage(oldImagePublicId);
  }

  logger.info({ userId: user.id }, "Profile updated");

  res.json({ user: user.toObject({ getters: true }) });
};

const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // validation Error
  if (req.validationError) {
    return next(new HttpError("Invalid inputs passed, please check your data.", 422));
  }
  const userId = req.params.uid;

  // security check: ensure the user making the request is the same as the user being updated
  if (req.userData?.userId !== userId) {
    return next(new HttpError("You are not allowed to edit this profile.", 403));
  }

  const { currentPassword, newPassword } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    logger.error({ err }, "Change Password failed");
    return next(new HttpError("Something went wrong, please try again.", 500));
  }

  if (!user) {
    return next(new HttpError("Could not find user.", 404));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(currentPassword, user.password);
  } catch (err) {
    logger.error({ err }, "Change Password failed");
    return next(new HttpError("Could not verify password, please try again.", 500));
  }

  if (!isValidPassword) {
    return next(new HttpError("Current password is incorrect.", 401));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(newPassword, 12);
  } catch (err) {
    logger.error({ err }, "Change Password failed");
    return next(new HttpError("Could not update password, please try again.", 500));
  }

  user.password = hashedPassword;

  try {
    await user.save();
  } catch (err) {
    logger.error({ err }, "Change Password failed");
    return next(new HttpError("Could not update password, please try again.", 500));
  }

  // Sign out every open tab; the new password issues new tokens at next login.
  closeUserConnections(user.id, 4001, "Password changed");
  res.json({ message: "Password updated successfully." });
};

export {
  signup,
  login,
  getUserById,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  searchUsers,
};