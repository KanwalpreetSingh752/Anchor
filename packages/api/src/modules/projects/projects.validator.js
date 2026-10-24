import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required.')
    .max(100, 'Project name must be at most 100 characters.'),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required.')
    .max(100, 'Project name must be at most 100 characters.'),
});
