import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

const PYTHON_AI_SERVICE = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    const body = await req.json();

    // Get user profile data (you'll need to fetch this from your database)
    // For now, using body data or defaults
    const userProfile = {
      userId: user._id.toString(),
      experience: body.experience || 'new',
      skillLevel: body.skillLevel || 1,
      age: body.age || 25,
      timeSpentCoding: body.timeSpentCoding || 5,
      motivation: body.motivation || 'medium',
      activityLevel: body.activityLevel || 'active',
      completionRate: body.completionRate || 0.7,
      engagementScore: body.engagementScore || 50
    };

    // Call Python ML service
    const response = await fetch(`${PYTHON_AI_SERVICE}/api/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userProfile)
    });

    if (!response.ok) {
      throw new Error(`Python service error: ${response.statusText}`);
    }

    const recommendations = await response.json();

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('AI recommendation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
