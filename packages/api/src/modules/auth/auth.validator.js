import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email({ message: 'Please provide a valid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .max(128, { message: 'Password must be at most 128 characters.' }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Please provide a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});
