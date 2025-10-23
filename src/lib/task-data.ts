
import Task from '../models/Task';
import { getUserFromRequest } from './auth';
import { cookies, headers as getHeaders } from 'next/headers';

export async function getTaskById(id: string) {
  // Await headers() as required by Next.js dynamic API
  const hdrs = await getHeaders();
  const req = {
    headers: hdrs,
  } as unknown as Request;
  const { user } = await getUserFromRequest(req);
  if (!user) return null;
  const task = await Task.findOne({ _id: id, user: user._id }).lean();
  if (!task || Array.isArray(task)) return null;
  // Convert _id to string for React/Next.js
  return { ...task, _id: (task as any)._id?.toString?.() ?? '' };
}
