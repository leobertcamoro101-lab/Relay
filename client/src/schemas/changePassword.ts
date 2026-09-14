import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),

    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine(val => /[A-Z]/.test(val), 'Must contain at least one uppercase letter')
      .refine(val => /[0-9]/.test(val), 'Must contain at least one number')
      .refine(val => /[!@#$%^&*]/.test(val), 'Must contain at least one special character (!@#$%^&*)'),

    confirmNewPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmNewPassword'],
      });
    }
  });

export type ChangePasswordInfo = z.infer<typeof changePasswordSchema>;