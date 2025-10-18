import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  dueAt: z.string().datetime().optional().or(z.literal('')).transform(v => (v ? v : undefined)).optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  dueAt: z.union([z.string().datetime(), z.null()]).optional(),
});

export const TaskIdParamSchema = z.object({
  id: z.string().min(1),
});
