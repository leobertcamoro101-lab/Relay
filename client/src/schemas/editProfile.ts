import { z } from 'zod';

export const editProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  birthday: z.string().trim().min(1, 'Birthday is required.'),
  gender: z.enum(['female', 'male', 'custom'], {
    error: 'Please select a gender.',
  }),
  email: z.string().trim().email('Please enter a valid email address.'),
});

export type EditProfileInfo = z.infer<typeof editProfileSchema>;