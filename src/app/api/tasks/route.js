import Task from '@/models/Task';
import { rateLimit } from '@/lib/rateLimiter';
import { getUserFromRequest } from '@/lib/auth';
import { TaskCreateSchema } from '@/features/tasks/schemas';
import { notifyNewTask } from '@/lib/notification-helper';

export async function GET(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:list:${ip}`, 30, 60 * 1000);
    if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

    const { user } = await getUserFromRequest(req);
    
    // Check if we should filter for NFT badges only
    const url = new URL(req.url);
    const nftOnly = url.searchParams.get('nftOnly') === 'true';
    
    // Build query - if nftOnly, filter for tasks with NFT badges
    const query = { userId: user._id.toString() };
    if (nftOnly) {
      query.nftMinted = true;
    }
    
    const tasks = await Task.find(query).sort({ dueAt: 1, createdAt: -1 }).lean();

    // Format tasks to ensure _id is string and all fields are properly serialized
    const formattedTasks = tasks.map(task => {
      // Normalize status field for backwards compatibility
      let status = task.status || 'pending';
      if (!task.status && task.completed) {
        status = 'completed';
      }

      return {
        ...task,
        _id: task._id.toString(),
        user: task.user?.toString(),
        status: status, // Ensure status is always present
        dueAt: task.dueAt ? task.dueAt.toISOString() : null,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        completedAt: task.completedAt ? task.completedAt.toISOString() : null,
        createdAt: task.createdAt ? task.createdAt.toISOString() : null,
        updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null
      };
    });

    console.log('Tasks GET - returning tasks:', formattedTasks.map(t => ({ id: t._id, title: t.title, status: t.status })));
    return new Response(JSON.stringify({ tasks: formattedTasks }), { status: 200 });
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
      // Safely extract error details from Zod error
      // Zod errors have an 'issues' property, not 'errors'
      const errorDetails = parsed.error?.issues 
        ? parsed.error.issues.map((e) => {
            const path = Array.isArray(e.path) ? e.path.join('.') : String(e.path || 'unknown');
            return `${path}: ${e.message || 'Invalid value'}`;
          }).join(', ')
        : parsed.error?.message || 'Invalid task data';
      
      return new Response(JSON.stringify({ 
        message: 'Validation error', 
        error: 'Invalid task data',
        errors: parsed.error?.flatten ? parsed.error.flatten() : { formErrors: [], fieldErrors: {} },
        details: errorDetails
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const { title, description, dueAt } = parsed.data;
    
    // Validate title is not empty
    if (!title || title.trim().length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Validation error', 
        error: 'Task title is required',
        details: 'Title cannot be empty'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Create task with both user (ObjectId) and userId (string) for compatibility
    const task = await Task.create({ 
      user: user._id, 
      userId: user._id.toString(),
      title: title.trim(),
      description: description || '',
      dueAt: dueAt ? new Date(dueAt) : undefined 
    });
    
    // Notify user about new task
    try {
      await notifyNewTask(user._id.toString(), title);
    } catch (notifError) {
      console.error('Failed to send task notification:', notifError);
    }
    
    return new Response(JSON.stringify({ task }), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(JSON.stringify({ 
        message: 'Unauthorized',
        error: 'Authentication required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('❌ Task creation error:', err);
    return new Response(JSON.stringify({ 
      message: 'Server error',
      error: err.message || 'Failed to create task',
      details: err.stack || 'Unknown error occurred'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
