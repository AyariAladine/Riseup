import Task from '@/models/Task';
import { getUserFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimiter';
import { TaskUpdateSchema, TaskIdParamSchema } from '@/features/tasks/schemas';

export async function GET(req, { params }) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:get:${ip}`, 60, 60 * 1000);
    if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

  const { user } = await getUserFromRequest(req);
  const { id } = await params;
    const task = await Task.findOne({ _id: id, userId: user._id.toString() });
    if (!task) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify({ task }), { status: 200 });
  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:update:${ip}`, 60, 60 * 1000);
    if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

  const { user } = await getUserFromRequest(req);
  const { id } = TaskIdParamSchema.parse(await params);
    const json = await req.json();
    const parsed = TaskUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ message: 'Validation error', errors: parsed.error.flatten() }), { status: 400 });
    }
    const v = parsed.data;
    const update = {};
    if (v.title !== undefined) update.title = v.title;
    if (v.completed !== undefined) update.completed = v.completed;
    if (v.dueAt !== undefined) update.dueAt = v.dueAt ? new Date(v.dueAt) : null;

    const task = await Task.findOneAndUpdate({ _id: id, userId: user._id.toString() }, update, { new: true });
    if (!task) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify({ task }), { status: 200 });
  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:delete:${ip}`, 60, 60 * 1000);
    if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

  const { user } = await getUserFromRequest(req);
  const { id } = await params;
    const task = await Task.findOneAndDelete({ _id: id, userId: user._id.toString() });
    if (!task) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
