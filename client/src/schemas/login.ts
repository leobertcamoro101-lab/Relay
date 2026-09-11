import { z } from 'zod';

// Login only needs to know a password was typed — complexity rules
// (uppercase/number/special char, etc.) belong to signup, where the
// password is being created, not checked against one that already exists.
export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase(),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginInfo = z.infer<typeof loginSchema>;
