import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import Task from '@/models/Task';

export async function POST(req) {
  try {
    await connectToDatabase();
    const { user } = await getUserFromRequest(req);
    const body = await req.json();
    const { challengeId, title } = body || {};
    if (!challengeId) return new Response(JSON.stringify({ message: 'challengeId is required' }), { status: 400 });

    const finalTitle = title || `Completed challenge: ${challengeId}`;
    // find an existing task for this challenge by title
    let task = await Task.findOne({ user: user._id, title: finalTitle });
    if (!task) {
      task = await Task.create({ user: user._id, title: finalTitle, completed: true });
    } else if (!task.completed) {
      task.completed = true;
      await task.save();
    }
    return new Response(JSON.stringify({ ok: true, taskId: task._id }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
}
