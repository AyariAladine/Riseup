import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().max(10000).optional(), // Increased from 2000 to 10000 to accommodate AI-generated descriptions with exercises
  dueAt: z.string().datetime().optional().or(z.literal('')).transform(v => (v ? v : undefined)).optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  dueAt: z.union([z.string().datetime(), z.null()]).optional(),
});

export const TaskIdParamSchema = z.object({
  id: z.string().min(1),
});
