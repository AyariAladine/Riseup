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
    console.log('Calling AI quiz service:', aiServiceUrl);
    console.log('Quiz request data:', quizRequestData);
    
    const response = await fetch(`${aiServiceUrl}/api/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizRequestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Quiz AI service error:', errorData);
      return NextResponse.json({error: 'Quiz AI service error', details: errorData}, { status: 500 });
    }
    
    const quizData = await response.json();
    console.log('Received quiz data from AI service:', JSON.stringify(quizData).substring(0, 200));
    
    // Transform the Python service response to match frontend expectations
    const rawQuiz = quizData.quiz || quizData;
    
    // Transform questions from Python format to frontend format
    const quiz = {
      title: rawQuiz.title || 'JavaScript Basics Quiz',
      description: rawQuiz.description || 'Test your knowledge',
      difficulty: rawQuiz.difficulty || 'medium',
      questions: (rawQuiz.questions || []).map(q => ({
        question: q.text || q.question || '',
        options: q.choices || q.options || [],
        correctAnswer: q.choices ? q.choices.indexOf(q.correct) : (q.correctAnswer || 0),
        explanation: q.explanation || ''
      }))
    };
    
    console.log('Returning quiz to frontend:', { hasQuiz: !!quiz, hasQuestions: !!quiz?.questions, questionCount: quiz?.questions?.length });
    
    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get quiz', details: error.message }, { status: 500 });
  }
}
