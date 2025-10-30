import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserLearningProfile from '@/models/UserLearningProfile';
import { NextResponse } from 'next/server';

// POST - Get AI personalized quiz
export async function POST(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get user learning profile
    const profile = await UserLearningProfile.findOne({
      $or: [
        { userId: user._id },
        { userId: user._id.toString() }
      ]
    });
    if (!profile) {
      return NextResponse.json({ 
        error: 'Please complete the onboarding questionnaire first' 
      }, { status: 400 });
    }

    // Prepare data for AI quiz service (extend as needed later)
    const quizRequestData = {
      userId: user._id.toString(),
      experience: profile.codingExperience,
      skillLevel: profile.skillLevel || 5,
      age: profile.age,
      timeSpentCoding: profile.hoursPerWeek || 5,
      motivation: profile.motivation || 'medium',
      activityLevel: (profile.activityLevel === 'very_active' || 
                      profile.activityLevel === 'active' || 
                      profile.activityLevel === 'somewhat_active') ? 'active' : 'inactive',
      completionRate: 0.7,
      engagementScore: 50
    };

    // POST to python backend
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';
    const response = await fetch(`${aiServiceUrl}/api/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizRequestData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({error: 'Quiz AI service error', details: errorData}, { status: 500 });
    }
    const quiz = await response.json();
    return NextResponse.json(quiz, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get quiz', details: error.message }, { status: 500 });
  }
}
