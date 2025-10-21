import Task from '@/models/Task';
import { rateLimit } from '@/lib/rateLimiter';
import { getUserFromRequest } from '@/lib/auth';
import { TaskCreateSchema } from '@/features/tasks/schemas';
import { sendPushToUser } from '@/lib/push';

export async function GET(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:list:${ip}`, 30, 60 * 1000);
    if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

    const { user } = await getUserFromRequest(req);
  const tasks = await Task.find({ user: user._id }).sort({ dueAt: 1, createdAt: -1 }).lean();
  console.log('Tasks GET - returning tasks count:', tasks.length);
  tasks.forEach(t => console.log(' task:', { id: t._id.toString(), dueAt: t.dueAt, dueDate: t.dueDate }));
  return new Response(JSON.stringify({ tasks }), { status: 200 });
  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:create:${ip}`, 30, 60 * 1000);
    if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

    const { user } = await getUserFromRequest(req);
    const json = await req.json();
    const parsed = TaskCreateSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ message: 'Validation error', errors: parsed.error.flatten() }), { status: 400 });
    }
    const { title, dueAt } = parsed.data;
    const task = await Task.create({ user: user._id, title, dueAt: dueAt ? new Date(dueAt) : undefined });
    // Notify user about new task
    try {
      await sendPushToUser(user._id, {
        title: 'Task created ✅',
        body: `"${title}" was added${dueAt ? ` • due ${new Date(dueAt).toLocaleDateString()}` : ''}.`,
        icon: '/globe.svg',
        url: '/dashboard/tasks',
      });
    } catch {}
    return new Response(JSON.stringify({ task }), { status: 201 });
  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
