import { z } from "zod";

const passwordRule = z.string().min(6, "Password must be at least 6 characters.");

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  birthday: z.string().trim().min(1, "Birthday is required."),
  gender: z.enum(["female", "male", "custom"], {
    error: "Gender must be female, male, or custom.",
  }),
  email: z.string().trim().email("Please provide a valid email address."),
  password: passwordRule,
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  birthday: z.string().trim().min(1, "Birthday is required."),
  gender: z.enum(["female", "male", "custom"], {
    error: "Gender must be female, male, or custom.",
  }),
  email: z.string().trim().email("Please provide a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required."),
  password: passwordRule,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: passwordRule,
});