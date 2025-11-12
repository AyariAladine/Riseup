import Task from '@/models/Task';
import { getUserFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimiter';
import { TaskUpdateSchema, TaskIdParamSchema } from '@/features/tasks/schemas';
import { connectToDatabase } from '@/lib/mongodb';
import { notifyTaskCompleted } from '@/lib/notification-helper';
import { trackInteraction } from '@/lib/track-interaction';

export async function GET(req, { params }) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:get:${ip}`, 60, 60 * 1000);
    if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

  const { user } = await getUserFromRequest(req);
  await connectToDatabase();
  const { id } = await params;
    // Use userId (string) for better-auth compatibility
    const task = await Task.findOne({ _id: id, userId: user._id });
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
  await connectToDatabase();
  const { id } = TaskIdParamSchema.parse(await params);
    const json = await req.json();
    const parsed = TaskUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ message: 'Validation error', errors: parsed.error.flatten() }), { status: 400 });
    }
    const v = parsed.data;
    const update = {};
    if (v.title !== undefined) update.title = v.title;
    if (v.completed !== undefined) {
      update.completed = v.completed;
      // Sync status with completed field for backwards compatibility
      update.status = v.completed ? 'completed' : 'pending';
      if (v.completed) {
        update.completedAt = new Date();
      }
    }
    if (v.status !== undefined) {
      console.log(`Updating task ${id} to status: ${v.status}`);
      update.status = v.status;
      // Sync completed field with status
      update.completed = v.status === 'completed';
      if (v.status === 'completed') {
        update.completedAt = new Date();
      }
    }
    if (v.dueAt !== undefined) update.dueAt = v.dueAt ? new Date(v.dueAt) : null;
    console.log('Update object:', update);
    
    // Use userId (string) for better-auth compatibility
    const task = await Task.findOneAndUpdate({ _id: id, userId: user._id }, update, { new: true });
    console.log('Task after update:', task);
    if (!task) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    
    // Track interaction for LightFM learning when status changes
    try {
      if (update.status === 'in_progress') {
        // Track that user started the task
        await trackInteraction({
          userId: user._id,
          taskId: task._id.toString(),
          taskTitle: task.title,
          taskDifficulty: task.difficulty || 'medium',
          taskCategory: task.category || 'general',
          taskSkills: task.skills || [],
          started: true,
          viewed: true,
          completed: false
        });
      } else if (update.status === 'completed' || update.completed === true) {
        // Track task completion (without score, as it might be completed manually)
        const timeSpent = task.completedAt && task.startedAt 
          ? Math.round((task.completedAt - task.startedAt) / (1000 * 60))
          : task.estimatedTime || 30;
        
        await trackInteraction({
          userId: user._id,
          taskId: task._id.toString(),
          taskTitle: task.title,
          taskDifficulty: task.difficulty || 'medium',
          taskCategory: task.category || 'general',
          taskSkills: task.skills || [],
          completed: true,
          score: task.score || null,
          timeSpent: timeSpent,
          started: true,
          viewed: true
        });
      }
    } catch (trackErr) {
      console.warn('[Task Update] Interaction tracking error:', trackErr);
    }
    
    // Send notification if task was just completed
    if (update.status === 'completed' || update.completed === true) {
      try {
        await notifyTaskCompleted(user._id.toString(), task.title);
      } catch (notifError) {
        console.error('Failed to send task completion notification:', notifError);
      }
    }
    
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
  await connectToDatabase();
  const { id } = await params;
    // Use userId (string) for better-auth compatibility
    const task = await Task.findOneAndDelete({ _id: id, userId: user._id });
    if (!task) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
