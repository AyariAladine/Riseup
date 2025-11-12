import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserLearningProfile from '@/models/UserLearningProfile';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { rateLimit } from '@/lib/rateLimiter';

// POST - Generate AI task description and exercises based on user profile and task
export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`ai:task-content:${ip}`, 20, 60 * 1000); // 20 requests per minute
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
    const { taskTitle, taskDifficulty, taskCategory, taskSkills, estimatedTime } = body;

    if (!taskTitle) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const groq = new Groq({ apiKey: groqKey });

    // Build prompt with user profile and task details
    const userContext = `
User Learning Profile:
- Experience Level: ${profile.codingExperience}
- Skill Level: ${profile.skillLevel}/10
- Preferred Languages: ${profile.languagesToLearn?.join(', ') || 'Not specified'}
- Hours per week: ${profile.hoursPerWeek}
- Motivation: ${profile.motivation}
- Activity Level: ${profile.activityLevel}
`;

    const taskContext = `
Task Details:
- Title: ${taskTitle}
${taskDifficulty ? `- Difficulty: ${taskDifficulty}` : ''}
${taskCategory ? `- Category: ${taskCategory}` : ''}
${taskSkills && taskSkills.length > 0 ? `- Skills: ${taskSkills.join(', ')}` : ''}
${estimatedTime ? `- Estimated Time: ${estimatedTime} minutes` : ''}
`;

    const prompt = `You are an expert coding instructor. Generate a concise task description with ONE practical exercise for a learning task.

${userContext}

${taskContext}

Generate:
1. A brief description (1-2 paragraphs) explaining what the student will learn
2. ONE hands-on exercise with clear instructions
3. Learning objectives (2-3 bullet points)

Format your response as JSON:
{
  "description": "Brief description here (1-2 paragraphs max)...",
  "exercise": {
    "title": "Exercise title",
    "instructions": "Clear step-by-step instructions for ONE exercise",
    "expectedOutcome": "What the student should achieve"
  },
  "learningObjectives": [
    "Objective 1",
    "Objective 2"
  ]
}

Keep it concise and focused. Make the content appropriate for ${profile.codingExperience} level students with skill level ${profile.skillLevel}/10.`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Updated to current model (replaces decommissioned llama-3.1-70b-versatile)
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert coding instructor that creates engaging, practical learning content. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2500, // Increased for more detailed exercises
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No content generated');
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Format the description with ONE exercise
      const exercise = parsedContent.exercise || parsedContent.exercises?.[0];
      const formattedDescription = `${parsedContent.description || ''}\n\n## Learning Objectives\n${(parsedContent.learningObjectives || []).map((obj) => `- ${obj}`).join('\n')}\n\n## Exercise\n${exercise ? `### ${exercise.title || 'Practice Exercise'}\n${exercise.instructions || ''}\n\n**Expected Outcome:** ${exercise.expectedOutcome || 'Complete the exercise successfully'}` : 'Complete the task as described above.'}`;

      return NextResponse.json({
        description: formattedDescription,
        rawContent: parsedContent,
        success: true
      }, { status: 200 });

    } catch (groqError) {
      console.error('Groq API error:', groqError);
      
      // Fallback description (concise with ONE exercise)
      const fallbackDescription = `Learn and practice ${taskTitle}.\n\nThis task is designed for ${profile.codingExperience} level students.\n\n## Learning Objectives\n- Understand the core concepts\n- Practice hands-on implementation\n- Apply best practices\n\n## Exercise\n### Practice Exercise\nComplete the coding exercise provided in the downloadable .txt file. Fill in the missing parts and modify the code as needed to solve the problem.\n\n**Expected Outcome:** Successfully complete the coding exercise and submit it for grading.`;
      
      return NextResponse.json({
        description: fallbackDescription,
        rawContent: null,
        success: false,
        error: 'AI generation failed, using fallback'
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Task content generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate task content', 
      details: error.message 
    }, { status: 500 });
  }
}

