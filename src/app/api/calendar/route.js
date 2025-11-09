import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/models/Task';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET - Get calendar events (tasks with due dates)
export async function GET(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = { userId: user._id };

    // If date range provided, filter tasks
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const tasks = await Task.find(query)
      .sort({ dueDate: 1 })
      .lean();

    // Transform tasks to calendar events format
    const events = tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      start: task.dueDate || task.createdAt,
      end: task.dueDate || task.createdAt,
      status: task.status,
      difficulty: task.difficulty,
      category: task.category,
      estimatedTime: task.estimatedTime,
      completed: task.status === 'completed',
      color: getColorByDifficulty(task.difficulty)
    }));

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

// POST - Create task from AI recommendation with due date
export async function POST(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task, dueDate, aiRecommendation } = body;

    await connectToDatabase();

    // Create new task with due date
    const parsedDue = dueDate ? new Date(dueDate) : null;
    const newTask = await Task.create({
      user: user._id,  // String for better-auth (keep for backward compatibility)
      userId: user._id,  // String version (primary field for better-auth)
      title: task.title,
      description: task.description,
      difficulty: task.difficulty,
      category: task.category,
      estimatedTime: task.estimatedTime,
      skills: task.skills || [],
      status: 'pending',
      dueDate: parsedDue,
      dueAt: parsedDue, // keep compatibility with other APIs that use dueAt
      aiGenerated: true,
      aiRecommendationData: aiRecommendation || null
    });
    console.log('Calendar POST - created task:', {
      id: newTask._id.toString(),
      dueDate: newTask.dueDate,
      dueAt: newTask.dueAt
    });

    return NextResponse.json({ 
      task: newTask,
      message: 'Task added to calendar successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}

// Helper function to assign colors based on difficulty
function getColorByDifficulty(difficulty) {
  const colorMap = {
    'easy': '#4CAF50',      // Green
    'medium': '#FF9800',    // Orange
    'hard': '#F44336'       // Red
  };
  return colorMap[difficulty] || '#2196F3'; // Default blue
}
