import { rateLimit } from '@/lib/rateLimiter';
import { getUserFromRequest } from '@/lib/auth';
import Task from '@/models/Task';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:summary-save:${ip}`, 20, 60 * 1000);
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { user } = await getUserFromRequest(req);
    const { taskId, summary } = await req.json();

    if (!taskId || !summary) {
      return new Response(JSON.stringify({ error: 'Task ID and summary are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await connectToDatabase();

    // Update task with AI summary
    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId: user._id.toString() },
      { aiSummary: summary },
      { new: true }
    );

    if (!task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ task }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Failed to save summary:', err);
    return new Response(JSON.stringify({ error: 'Failed to save summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
