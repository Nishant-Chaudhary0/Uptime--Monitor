import z from 'zod';

export const uptimeValidation = z.object({
    range: z.enum(["24h", "7d", "30d"]).default("24h"),
});

export const askQuestionSchema = z.object({
  question: z.string()
    .min(3, "Question is too short")
    .max(500, "Question is too long"),
});