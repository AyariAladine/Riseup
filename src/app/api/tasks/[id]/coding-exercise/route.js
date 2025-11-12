import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/models/Task';
import UserLearningProfile from '@/models/UserLearningProfile';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { rateLimit } from '@/lib/rateLimiter';

/**
 * GET /api/tasks/[id]/coding-exercise
 * Generate and download a coding exercise .txt file for a task
 */
export async function GET(request, { params }) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`coding-exercise:${ip}`, 10, 60 * 1000); // 10 requests per minute
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    
    // Get task (check both user ObjectId and userId string for compatibility)
    const task = await Task.findOne({
      _id: id,
      $or: [
        { user: user._id },
        { userId: user._id.toString() }
      ]
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

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

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const groq = new Groq({ apiKey: groqKey });

    // Build context for exercise generation
    const userContext = `
User Learning Profile:
- Experience Level: ${profile.codingExperience}
- Skill Level: ${profile.skillLevel}/10
- Preferred Languages: ${profile.languagesToLearn?.join(', ') || 'Not specified'}
- Hours per week: ${profile.hoursPerWeek}
`;

    const taskContext = `
Task Details:
- Title: ${task.title}
- Description: ${task.description?.substring(0, 500) || 'No description'}
- Difficulty: ${task.difficulty || 'medium'}
- Category: ${task.category || 'general'}
- Skills: ${task.skills?.join(', ') || 'Not specified'}
`;

    // Determine exercise type (prefer fill-in-the-blank for easier modification)
    const exerciseType = 'fill_in_blank'; // Always use fill-in-the-blank so students can modify the template
    
    const preferredLanguage = profile.languagesToLearn?.[0] || 'JavaScript';
    
    const prompt = `You are an expert coding instructor. Create a fill-in-the-blank coding exercise with a code template that students can modify and submit.

${userContext}

${taskContext}

Generate a fill-in-the-blank coding exercise related to this task. The exercise MUST include:
1. A clear problem statement (2-3 sentences)
2. Example input/output
3. A code template with missing parts (use ___ or TODO: comments for parts to fill)
4. The code template should be complete enough to be runnable after filling in the blanks
5. Be appropriate for ${profile.codingExperience} level (skill ${profile.skillLevel}/10)
6. Use this language: ${preferredLanguage}

Format your response EXACTLY like this:
PROBLEM:
[Clear problem description in 2-3 sentences]

EXAMPLE INPUT:
[Show example input]

EXAMPLE OUTPUT:
[Show expected output]

CODE TEMPLATE:
\`\`\`${preferredLanguage.toLowerCase()}
[Write a code template here with 2-4 missing parts marked with ___ or TODO: comments]
\`\`\`

YOUR TASK:
Fill in the missing parts (marked with ___ or TODO:) to complete the code. You can also modify the code as needed.

Make it challenging but fair for the skill level. The code template should be practical and related to: "${task.title}".`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert coding instructor. Generate clear, practical coding exercises. Always provide complete, well-formatted exercises.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      });

      const exerciseContent = completion.choices[0]?.message?.content?.trim();
      
      if (!exerciseContent) {
        throw new Error('No exercise content generated');
      }

      // Format the exercise file content with code template
      const fileContent = `CODING EXERCISE: ${task.title}
Generated for: ${profile.codingExperience} level (Skill: ${profile.skillLevel}/10)
Difficulty: ${task.difficulty || 'medium'}
Category: ${task.category || 'general'}
Language: ${preferredLanguage}

${'='.repeat(60)}

${exerciseContent}

${'='.repeat(60)}

INSTRUCTIONS:
1. Read the problem carefully
2. Fill in the missing parts marked with ___ or TODO: in the code template
3. You can modify the code as needed to solve the problem
4. Test your solution with the provided examples
5. Make sure your code is clean and follows best practices
6. Save your completed code and submit it for grading

NOTE: This file contains a code template you can modify. Fill in the blanks and improve the code as needed!

Good luck! 🚀
`;

      // Return as downloadable .txt file
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="coding-exercise-${task.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt"`
        }
      });

    } catch (groqError) {
      console.error('Groq API error generating exercise:', groqError);
      
      // Fallback exercise with code template
      const fallbackExercise = `CODING EXERCISE: ${task.title}
Generated for: ${profile.codingExperience} level (Skill: ${profile.skillLevel}/10)
Difficulty: ${task.difficulty || 'medium'}
Language: ${preferredLanguage}

${'='.repeat(60)}

PROBLEM:
Write a function that demonstrates the core concepts related to "${task.title}".

EXAMPLE INPUT:
[Provide example input based on the task]

EXAMPLE OUTPUT:
[Provide expected output]

CODE TEMPLATE:
\`\`\`${preferredLanguage.toLowerCase()}
// TODO: Write your function here
function solveProblem(input) {
    // TODO: Add your logic here
    return ___
}

// Test your solution
console.log(solveProblem(/* example input */));
\`\`\`

YOUR TASK:
Fill in the missing parts (marked with ___ or TODO:) to complete the code. You can modify the code as needed.

INSTRUCTIONS:
1. Fill in the blanks marked with ___ or TODO:
2. Test your solution with the provided examples
3. Make sure your code is clean and follows best practices
4. Save your completed code and submit it for grading

${'='.repeat(60)}

Good luck! 🚀
`;

      return new NextResponse(fallbackExercise, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="coding-exercise-${task.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt"`
        }
      });
    }

  } catch (error) {
    console.error('Coding exercise generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate coding exercise', 
      details: error.message 
    }, { status: 500 });
  }
}

