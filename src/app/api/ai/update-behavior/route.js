import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserTaskInteraction from '@/models/UserTaskInteraction';
import Task from '@/models/Task';

const PYTHON_AI_SERVICE = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const {
      taskId,
      taskCompleted,
      timeSpent,
      difficulty,
      score,
      viewed,
      started,
      abandoned,
      taskTitle,
      taskCategory,
      taskSkills
    } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Fetch task details if not provided
    let task = null;
    if (taskId) {
      try {
        task = await Task.findById(taskId);
      } catch (e) {
        console.warn('Task not found, using provided data:', e);
      }
    }

    // Prepare interaction data
    const interactionData = {
      userId: user._id.toString(),
      taskId: taskId,
      taskTitle: taskTitle || task?.title || 'Unknown Task',
      taskDifficulty: difficulty || task?.difficulty || 'medium',
      taskCategory: taskCategory || task?.category || 'general',
      taskSkills: taskSkills || task?.skills || [],
      completed: taskCompleted || false,
      score: score !== undefined ? score : null,
      timeSpent: timeSpent || 0,
      viewed: viewed !== undefined ? viewed : true,
      started: started !== undefined ? started : (taskCompleted || false),
      abandoned: abandoned || false
    };

    // Update or create interaction
    const interaction = await UserTaskInteraction.findOneAndUpdate(
      { userId: user._id.toString(), taskId: taskId },
      {
        ...interactionData,
        $inc: { attempts: 1 },
        $set: {
          ...(viewed && !interactionData.firstViewedAt ? { firstViewedAt: new Date() } : {}),
          ...(started && !interactionData.startedAt ? { startedAt: new Date() } : {}),
          ...(taskCompleted && !interactionData.completedAt ? { completedAt: new Date() } : {})
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Calculate and save weight
    interaction.calculateWeight();
    await interaction.save();

    console.log('User task interaction saved:', {
      userId: user._id.toString(),
      taskId,
      completed: interaction.completed,
      score: interaction.score,
      weight: interaction.interactionWeight
    });

    // Notify Python service (async, don't wait)
    const behaviorData = {
      userId: user._id.toString(),
      taskCompleted: taskCompleted || false,
      timeSpent: timeSpent || 0,
      difficulty: difficulty || 'medium',
      taskId: taskId.toString(),
      score: score || null,
      interactionWeight: interaction.interactionWeight
    };

    // Fire and forget to Python service
    fetch(`${PYTHON_AI_SERVICE}/api/update-behavior`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(behaviorData)
    }).catch(err => console.warn('Python service notification failed:', err));

    return NextResponse.json({
      success: true,
      interaction: {
        id: interaction._id.toString(),
        weight: interaction.interactionWeight,
        completed: interaction.completed,
        score: interaction.score
      }
    });
  } catch (error) {
    console.error('Behavior update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update behavior' },
      { status: 500 }
    );
  }
}
