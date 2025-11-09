import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserLearningProfile from '@/models/UserLearningProfile';
import { NextResponse } from 'next/server';

// POST - Get AI task recommendations
export async function POST(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get user learning profile - try both formats
    const profile = await UserLearningProfile.findOne({
      $or: [
        { userId: user._id },
        { userId: user._id.toString() }
      ]
    });
    
    console.log('User ID:', user._id.toString());
    console.log('Profile found:', !!profile);
    
    if (!profile) {
      return NextResponse.json({ 
        error: 'Please complete the onboarding questionnaire first' 
      }, { status: 400 });
    }

    // Prepare data for AI service - match Flask API expected format
    const aiRequestData = {
      userId: user._id.toString(),
      experience: profile.codingExperience, // 'new', 'intermediate', 'expert'
      skillLevel: profile.skillLevel || 5,
      age: profile.age,
      timeSpentCoding: profile.hoursPerWeek || 5,
      motivation: profile.motivation || 'medium', // 'high', 'medium', 'low'
      activityLevel: (profile.activityLevel === 'very_active' || 
                      profile.activityLevel === 'active' || 
                      profile.activityLevel === 'somewhat_active') ? 'active' : 'inactive',
      completionRate: 0.7, // Can be calculated from task history
      engagementScore: 50   // Can be calculated from user activity
    };

    console.log('Sending to AI service:', aiRequestData);

    // Call Python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';
    const response = await fetch(`${aiServiceUrl}/api/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(aiRequestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('AI service error:', response.status, errorData);
      throw new Error(`AI service error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('AI recommendations received:', data);

    // Map to dashboard shape while preserving original fields
    const plan = Array.isArray(data?.tasks)
      ? data.tasks.map((t) => ({ title: t.title, minutes: t.minutes, details: t.details || t.difficulty }))
      : [];

    return NextResponse.json({ ...data, plan, source: 'lightfm' }, { status: 200 });
  } catch (error) {
    console.error('AI Recommendation error:', error);
    return NextResponse.json({ 
      error: 'Failed to get recommendations',
      details: error.message 
    }, { status: 500 });
  }
}
