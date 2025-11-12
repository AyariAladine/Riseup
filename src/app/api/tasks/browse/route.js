import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/models/Task';
import { rateLimit } from '@/lib/rateLimiter';
import { NextResponse } from 'next/server';

/**
 * GET /api/tasks/browse
 * Get all available tasks from the database (not just user's tasks)
 * This allows users to browse and select from the full task catalog
 */
export async function GET(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:browse:${ip}`, 30, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query - get all tasks (not just user's)
    const query = { 
      status: { $ne: 'cancelled' } // Exclude cancelled tasks
    };

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (category) {
      query.category = category;
    }

    // Get tasks, sorted by creation date (newest first)
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title description difficulty category skills estimatedTime _id')
      .lean();

    // Format tasks for frontend
    const formattedTasks = tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description || '',
      difficulty: task.difficulty || 'medium',
      category: task.category || 'general',
      skills: task.skills || [],
      estimatedTime: task.estimatedTime || 30,
      minutes: task.estimatedTime || 30
    }));

    return NextResponse.json({ 
      tasks: formattedTasks,
      total: formattedTasks.length
    }, { status: 200 });

  } catch (error) {
    console.error('Browse tasks error:', error);
    return NextResponse.json({ 
      error: 'Failed to browse tasks',
      details: error.message 
    }, { status: 500 });
  }
}

