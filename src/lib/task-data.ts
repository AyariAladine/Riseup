
import Task from '../models/Task';
import { getUserFromRequest } from './auth';
import { cookies, headers as getHeaders } from 'next/headers';
import { connectToDatabase } from './mongodb';

export async function getTaskById(id: string) {
  // Await headers() as required by Next.js dynamic API
  const hdrs = await getHeaders();
  const req = {
    headers: hdrs,
  } as unknown as Request;
  const { user } = await getUserFromRequest(req);
  if (!user) return null;
  
  // Connect to database before querying
  await connectToDatabase();
  
  // Use userId (string) for better-auth compatibility
  const task = await Task.findOne({ _id: id, userId: user._id }).lean();
  if (!task || Array.isArray(task)) return null;
  // Convert _id to string for React/Next.js
  return { ...task, _id: (task as any)._id?.toString?.() ?? '' };
}
