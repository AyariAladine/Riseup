import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserLearningProfile from '@/models/UserLearningProfile';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { rateLimit } from '@/lib/rateLimiter';

// POST - Get AI personalized quiz based on user profile and task context
export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`ai:quiz:${ip}`, 15, 60 * 1000); // 15 requests per minute
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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

    const body = await request.json();
    const { taskContext } = body;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.error('❌ GROQ_API_KEY not set! Quiz generation requires Groq API key.');
      return NextResponse.json({ 
        error: 'AI quiz service not configured. Please set GROQ_API_KEY environment variable.',
        details: 'Quiz generation requires Groq API key to create dynamic, personalized quizzes.'
      }, { status: 503 });
    }

    const groq = new Groq({ apiKey: groqKey });

    // Build context for quiz generation
    const userContext = `
User Learning Profile:
- Experience Level: ${profile.codingExperience}
- Skill Level: ${profile.skillLevel}/10
- Preferred Languages: ${profile.languagesToLearn?.join(', ') || 'Not specified'}
- Hours per week: ${profile.hoursPerWeek}
- Motivation: ${profile.motivation}
`;

    const taskInfo = taskContext ? `
Task Context:
- Title: ${taskContext.title || 'General'}
${taskContext.description ? `- Description: ${taskContext.description.substring(0, 300)}` : ''}
${taskContext.difficulty ? `- Difficulty: ${taskContext.difficulty}` : ''}
${taskContext.category ? `- Category: ${taskContext.category}` : ''}
${taskContext.skills && taskContext.skills.length > 0 ? `- Skills: ${taskContext.skills.join(', ')}` : ''}
` : 'No specific task context provided. Generate a general quiz.';

    const prompt = `You are an expert coding instructor creating a personalized quiz.

${userContext}

${taskInfo}

Generate a comprehensive quiz with 8-12 questions that:
1. Tests deep understanding of the task concepts and related topics
2. Is appropriate for ${profile.codingExperience} level (skill ${profile.skillLevel}/10)
3. Includes practical coding questions, code snippets, and real-world scenarios
4. Has detailed explanations for each answer (2-3 sentences)
5. Covers multiple aspects: syntax, concepts, best practices, and problem-solving
6. Mix of question types: multiple choice, code analysis, and conceptual questions

Format as JSON:
{
  "title": "Quiz title related to the task",
  "description": "Brief description of what this quiz covers",
  "difficulty": "${profile.codingExperience}",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Generate ${taskContext ? 'task-specific' : 'general'} questions. Make them challenging but fair for the skill level.`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Updated to current model (replaces decommissioned llama-3.1-70b-versatile)
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert coding instructor. Always respond with valid JSON only. Generate engaging, educational quiz questions.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000, // Increased for longer quizzes
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No content generated');
      }

      let parsedQuiz;
      try {
        parsedQuiz = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedQuiz = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Transform to frontend format
      const quiz = {
        title: parsedQuiz.title || `${taskContext?.title || 'Coding'} Quiz`,
        description: parsedQuiz.description || 'Test your knowledge',
        difficulty: parsedQuiz.difficulty || profile.codingExperience,
        questions: (parsedQuiz.questions || []).map((q, idx) => ({
          question: q.question || `Question ${idx + 1}`,
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || 'Review the material to understand this concept.'
        }))
      };

      // Ensure we have at least 8 questions
      if (quiz.questions.length < 8) {
        console.warn(`Quiz has only ${quiz.questions.length} questions, expected 8-12. Regenerating...`);
        // If we got fewer than 8, the AI might not have followed instructions
        // We'll keep what we have but log a warning
        if (quiz.questions.length < 5) {
          // Only add fallback if we have very few questions
          while (quiz.questions.length < 8) {
          quiz.questions.push({
            question: `What is a key concept related to ${taskContext?.title || 'programming'}?`,
            options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
            correctAnswer: 0,
            explanation: 'This is a fundamental concept you should understand.'
          });
          }
        }
      }
      
      console.log(`✅ Quiz generated with ${quiz.questions.length} questions`);

      console.log('Generated quiz with Groq:', { 
        title: quiz.title, 
        questionCount: quiz.questions.length 
      });

      return NextResponse.json({ quiz }, { status: 200 });

    } catch (groqError) {
      // Log full error object for debugging
      console.error('❌ Groq API error (full):', {
        error: groqError,
        message: groqError?.message,
        name: groqError?.name,
        code: groqError?.code,
        status: groqError?.status,
        statusCode: groqError?.statusCode,
        type: typeof groqError,
        keys: Object.keys(groqError || {}),
        stringified: String(groqError),
        json: JSON.stringify(groqError, Object.getOwnPropertyNames(groqError))
      });
      
      // Extract error message from various possible locations
      let errorMsg = 'Unknown error';
      if (groqError?.message) {
        errorMsg = groqError.message;
      } else if (groqError?.error?.message) {
        errorMsg = groqError.error.message;
      } else if (groqError?.response?.data?.error?.message) {
        errorMsg = groqError.response.data.error.message;
      } else if (typeof groqError === 'string') {
        errorMsg = groqError;
      } else {
        try {
          errorMsg = String(groqError);
        } catch (e) {
          errorMsg = 'Unknown Groq API error';
        }
      }
      
      const errorName = groqError?.name || groqError?.error?.name || '';
      const errorCode = groqError?.code || groqError?.status || groqError?.statusCode || groqError?.error?.code || '';
      
      // Check if it's a network/connection error
      const isNetworkError = 
        errorMsg.includes('Network') || 
        errorMsg.includes('network') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('ENOTFOUND') ||
        errorMsg.includes('ETIMEDOUT') ||
        errorMsg.includes('Failed to fetch') ||
        errorName === 'NetworkError' ||
        errorCode === 'ECONNREFUSED' ||
        errorCode === 'ENOTFOUND';
      
      // Check if it's an API key/auth error
      const isAuthError = 
        errorMsg.includes('401') ||
        errorMsg.includes('Unauthorized') ||
        errorMsg.includes('Invalid API key') ||
        errorMsg.includes('authentication') ||
        errorCode === 401;
      
      // Check if it's a rate limit error
      const isRateLimit = 
        errorMsg.includes('429') ||
        errorMsg.includes('rate limit') ||
        errorCode === 429;
      
      // Check if it's a model decommissioned error
      const isModelDecommissioned = 
        errorMsg.includes('decommissioned') ||
        errorMsg.includes('model_decommissioned') ||
        groqError?.error?.error?.code === 'model_decommissioned' ||
        groqError?.error?.code === 'model_decommissioned';
      
      let userFriendlyError = 'Failed to generate dynamic quiz';
      let details = errorMsg;
      
      if (isModelDecommissioned) {
        userFriendlyError = 'AI model has been updated';
        details = 'The AI model used for quiz generation has been updated. Please refresh the page and try again. If the issue persists, contact support.';
      } else if (isNetworkError) {
        userFriendlyError = 'Cannot connect to AI quiz service';
        details = 'The quiz service is temporarily unavailable. This could be due to network issues or the AI service being down. Please try again in a few moments.';
      } else if (isAuthError) {
        userFriendlyError = 'AI quiz service authentication failed';
        details = 'The GROQ_API_KEY may be invalid or expired. Please check your API key configuration.';
      } else if (isRateLimit) {
        userFriendlyError = 'AI quiz service rate limit exceeded';
        details = 'Too many requests. Please wait a moment and try again.';
      } else {
        details = `Groq API error: ${errorMsg}. Please check your GROQ_API_KEY and try again.`;
      }
      
      // Log what we're about to return
      console.log('📤 Returning error response:', {
        userFriendlyError,
        details,
        originalError: errorMsg,
        isNetworkError,
        isAuthError,
        isRateLimit,
        isModelDecommissioned
      });
      
      return NextResponse.json({ 
        error: userFriendlyError,
        details: details,
        technicalError: errorMsg, // Include original error for debugging
        fallback: 'The quiz service requires Groq API to generate personalized, task-specific quizzes.'
      }, { status: 500 });
    }

  } catch (error) {
    // Outer catch - handles errors outside the Groq try-catch
    console.error('❌ Quiz generation error (outer catch):', {
      error,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      type: typeof error
    });
    
    const errorMsg = error?.message || String(error) || 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Failed to generate quiz',
      details: errorMsg,
      technicalError: errorMsg
    }, { status: 500 });
  }
}

// Fallback to Python service
async function fallbackToPythonService(user, profile, taskContext = null) {
  try {
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
      engagementScore: 50,
      ...(taskContext && { taskContext })
    };

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';
    const response = await fetch(`${aiServiceUrl}/api/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizRequestData)
    });
    
    if (!response.ok) {
      throw new Error('Python service unavailable');
    }
    
    const quizData = await response.json();
    const rawQuiz = quizData.quiz || quizData;
    
    const quiz = {
      title: rawQuiz.title || 'JavaScript Basics Quiz',
      description: rawQuiz.description || 'Test your knowledge',
      difficulty: rawQuiz.difficulty || 'medium',
      questions: (rawQuiz.questions || []).map((q) => ({
        question: q.text || q.question || '',
        options: q.choices || q.options || [],
        correctAnswer: q.choices ? q.choices.indexOf(q.correct) : (q.correctAnswer || 0),
        explanation: q.explanation || ''
      }))
    };
    
    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error) {
    console.error('Python service fallback failed:', error);
    throw error;
  }
}
