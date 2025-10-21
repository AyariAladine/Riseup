import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

const PYTHON_AI_SERVICE = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    const body = await req.json();

    const behaviorData = {
      userId: user._id.toString(),
      taskCompleted: body.taskCompleted || false,
      timeSpent: body.timeSpent || 0,
      difficulty: body.difficulty || 'medium',
      taskId: body.taskId || ''
    };

    // Call Python ML service to update behavior
    const response = await fetch(`${PYTHON_AI_SERVICE}/api/update-behavior`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(behaviorData)
    });

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`);
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Behavior update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update behavior' },
      { status: 500 }
    );
  }
}
