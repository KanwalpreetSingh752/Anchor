import { z } from 'zod';

export const createStatusPageSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required.')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens.')
    .toLowerCase(),
  description: z.string().max(500).optional(),
  monitors: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(true),
  customDomain: z.string().max(253).optional(),
});

export const updateStatusPageSchema = createStatusPageSchema.partial();
