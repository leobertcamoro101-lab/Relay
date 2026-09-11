import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"

import { deleteCloudinaryImage, extractPublicId } from "../util/cloudinary-cleanup";
import HttpError from "../models/http-error";
import logger from "../util/logger";
import User from "../models/user";
import { AuthRequest } from "../middleware/check-auth";

const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.params.uid;

  // // security check: same pattern you already use in updateProfile
  // if (req.userData?.userId !== userId) {
  //   return next(new HttpError("You are not allowed to view this profile.", 403));
  // }

  let user;
  try {
    user = await User.findById(userId).select("-password");
  } catch (err) {
    return next(new HttpError("Something went wrong, could not fetch profile.", 500));
  }

  if (!user) {
    return next(new HttpError("Could not find user.", 404));
  }

  res.json({ user: user.toObject({ getters: true }) });
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
   
    return next(new HttpError("Signing up failed, please try again later.", 500));
  }

  if (existingUser) {
    
    return next(new HttpError("User exists already, please login instead", 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    
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
    
    // console.log(err);
    logger.error({ err }, "signup failed");
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" }
    );
  } catch (err) {
    // console.log(err);
    logger.error({ err }, "signup failed");
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

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
    return next(new HttpError("Logging in failed, please try again later.", 500));
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials, could not log you in", 403));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("Could not log you in please check credentials and try again", 500));
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials, could not log you in", 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" }
    );
  } catch (err) {
    // console.log(err);
    logger.error({ err }, "login failed");
    return next(new HttpError("Logging in failed, please try again.", 500));
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    image: existingUser.image,
    token,
  });
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
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("Something went wrong, could not update profile.", 500));
  }

  if (!user) {
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("Could not find user.", 404));
  }

  if (email && email !== user.email) {
    let existingEmailUser;
    try {
      existingEmailUser = await User.findOne({ email });
    } catch (err) {
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
    await deleteCloudinaryImage(req.file?.cloudinaryPublicId);
    return next(new HttpError("Updating profile failed, please try again.", 500));
  }

  if (oldImagePublicId) {
    await deleteCloudinaryImage(oldImagePublicId);
  }

  res.json({ user: user.toObject({ getters: true }) });
};

export { signup, login, getUserById, updateProfile };