import z from 'zod';

export const uptimeValidation = z.object({
    range: z.enum(["24h", "7d", "30d"]).default("24h"),
});