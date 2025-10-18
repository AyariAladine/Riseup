import { z } from 'zod';

export const ProfileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  currentPassword: z.string().min(1).optional(),
  avatar: z.string().url().or(z.string().startsWith('data:image/')).optional(),
  preferences: z
    .object({ theme: z.enum(['system', 'light', 'dark']).optional(), emailNotifications: z.boolean().optional() })
    .partial()
    .optional(),
});

export const EmailChangeStartSchema = z.object({ newEmail: z.string().email() });
export const EmailChangeConfirmSchema = z.object({ uid: z.string().min(8), token: z.string().min(10) });
