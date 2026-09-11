// ============================================
// ZOD SCHEMAS — Complete Reference
//
// This file covers every important Zod concept.
// Read it top to bottom for the full picture.
// ============================================
import { z } from 'zod';

// ============================================
// LESSON 1: Primitive Types
// z.string(), z.number(), z.boolean(),
// z.date(), z.undefined(), z.null(), z.any()
//
// LESSON 2: String validations
// z.string().min().max().email().url().regex().trim().toLowerCase()
//
// LESSON 3: Number validations
// z.number().min().max().int().positive().multipleOf()
// ============================================

// ============================================
// STEP 1 SCHEMA: Personal Info
// Covers: string, email, optional, transform
// ============================================
export const personalInfoSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long')
    .transform(val => val.trim()),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long')
    .transform(val => val.trim()),

  birthday: z
    .string()
    .trim()
    .min(1, 'Birthday is required.'),

  gender: z.enum(['female', 'male', 'custom'], {
    error: 'Please select a gender.',
  }),

  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase(), // transform to lowercase

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(val => /[A-Z]/.test(val), 'Must contain at least one uppercase letter')
    .refine(val => /[0-9]/.test(val), 'Must contain at least one number')
    .refine(val => /[!@#$%^&*]/.test(val), 'Must contain at least one special character (!@#$%^&*)'),

  // ============================================
  // LESSON 4: Optional fields
  // .optional() → value can be undefined
  // .nullable() → value can be null
  // ============================================
  age: z
    .number({ error: 'Age must be a number' })
    .int('Age must be a whole number')
    .min(18, 'You must be at least 18 years old')
    .max(120, 'Please enter a valid age')
    .optional(),
    
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number')
    .optional(),

  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')), // allow empty string too
});

// ============================================
// LESSON 5: z.infer — extract TypeScript type
// from a Zod schema — no duplicate types!
// ============================================
export type PersonalInfo = z.infer<typeof personalInfoSchema>;

// ============================================
// STEP 2 SCHEMA: Account Info
// Covers: regex, refine, superRefine
// ============================================
export const accountSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    // ============================================
    // LESSON 6: .refine() — custom validation
    // Return true = valid, false = error
    // ============================================
    .refine(val => /[A-Z]/.test(val), 'Must contain at least one uppercase letter')
    .refine(val => /[0-9]/.test(val), 'Must contain at least one number')
    .refine(val => /[!@#$%^&*]/.test(val), 'Must contain at least one special character (!@#$%^&*)'),

  confirmPassword: z.string(),

  role: z.enum(['user', 'admin', 'moderator'], {
    error: 'Please select a valid role',
  }),

})
// ============================================
// LESSON 7: .superRefine() — cross-field validation
// Validates relationships between fields
// ============================================
.superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirmPassword'], // which field shows the error
    });
  }
});

export type AccountInfo = z.infer<typeof accountSchema>;

// ============================================
// STEP 3 SCHEMA: Preferences
// Covers: array, union, discriminated union,
//         boolean, default, min array length
// ============================================
export const preferencesSchema = z.object({
  // ============================================
  // LESSON 8: z.array() + .min()
  // ============================================
  interests: z
    .array(z.enum(['tech', 'design', 'business', 'science', 'arts', 'sports']))
    .min(1, 'Please select at least one interest')
    .max(3, 'Please select at most 3 interests'),

  // ============================================
  // LESSON 9: z.union() — one of multiple types
  // ============================================
  experience: z.union([
    z.literal('beginner'),
    z.literal('intermediate'),
    z.literal('advanced'),
    z.literal('expert'),
  ]),

  // ============================================
  // LESSON 10: .default() — fallback value
  // ============================================
  newsletter: z.boolean().default(false),
  notifications: z.boolean().default(true),

  // ============================================
  // LESSON 11: z.discriminatedUnion()
  // More efficient than z.union() when objects
  // share a common "type" discriminator field
  // ============================================
  contactPreference: z.discriminatedUnion('method', [
    z.object({ method: z.literal('email'), emailFrequency: z.enum(['daily', 'weekly', 'monthly']) }),
    z.object({ method: z.literal('sms'), phoneNumber: z.string().min(10) }),
    z.object({ method: z.literal('none') }),
  ]),
});

export type Preferences = z.infer<typeof preferencesSchema>;

// ============================================
// LESSON 12: Combining schemas
// .merge() combines two object schemas
// .extend() adds fields to existing schema
// .pick() keeps only specified fields
// .omit() removes specified fields
// .partial() makes all fields optional
// ============================================
// export const fullRegistrationSchema = personalInfoSchema
//   .merge(accountSchema.omit({ confirmPassword: true }))
//   .extend({
//     preferences: preferencesSchema,
//     agreedToTerms: z.literal(true, {
//       error: 'You must agree to the terms',
//     }),
//   });

// export type FullRegistration = z.infer<typeof fullRegistrationSchema>;
// Extract just the account fields without confirmPassword
const accountWithoutConfirm = z.object({
  username: accountSchema.shape.username,
  password: accountSchema.shape.password,
  role: accountSchema.shape.role,
});

export const fullRegistrationSchema = personalInfoSchema
  .merge(accountWithoutConfirm)
  .extend({
    preferences: preferencesSchema,
    agreedToTerms: z.literal(true, {
      error: 'You must agree to the terms',
    }),
  });

export type FullRegistration = z.infer<typeof fullRegistrationSchema>;

// ============================================
// LESSON 13: parse vs safeParse
//
// parse() → throws ZodError if invalid
// safeParse() → returns { success, data, error }
//               never throws!
// ============================================
export const validateEmail = (email: string) => {
  const result = z.string().email().safeParse(email);
  if (result.success) {
    return { valid: true, value: result.data };
  } else {
    return { valid: false, error: result.error.issues[0].message };
  }
};
