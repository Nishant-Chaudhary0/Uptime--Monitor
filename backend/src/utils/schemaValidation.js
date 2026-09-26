import z from 'zod';

export const uptimeValidation = z.object({
    range: z.enum(["24h", "7d", "30d"]).default("24h"),
});

export const askQuestionSchema = z.object({
  question: z.string()
    .min(3, "Question is too short")
    .max(500, "Question is too long"),
});

export const registerSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});