import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine(val => /[A-Z]/.test(val), 'Must contain at least one uppercase letter')
      .refine(val => /[0-9]/.test(val), 'Must contain at least one number')
      .refine(val => /[!@#$%^&*]/.test(val), 'Must contain at least one special character (!@#$%^&*)'),

    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  });

export type ResetPasswordInfo = z.infer<typeof resetPasswordSchema>;