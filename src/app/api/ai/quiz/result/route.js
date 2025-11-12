import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserLearningProfile from '@/models/UserLearningProfile';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimiter';
import { determineBadgeLevel } from '@/lib/achievement-utils';
import { updateSkillLevel, detectLanguageFromTask } from '@/lib/update-skill-level';

/**
 * POST /api/ai/quiz/result
 * Handle quiz submission results:
 * 1. Update skill level based on score (up if good, down if bad)
 * 2. Unlock achievements if score is high enough
 */
export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`ai:quiz:result:${ip}`, 20, 60 * 1000); // 20 requests per minute
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { quizId, score, totalQuestions, answers, taskContext } = body;

    if (typeof score !== 'number' || typeof totalQuestions !== 'number' || totalQuestions === 0) {
      return NextResponse.json({ 
        error: 'Invalid score or totalQuestions' 
      }, { status: 400 });
    }

    // Calculate percentage
    const percentage = Math.round((score / totalQuestions) * 100);

    // Update skill level based on performance
    let skillLevelUpdate = null;
    try {
      skillLevelUpdate = await updateSkillLevel(user._id, percentage);
    } catch (skillError) {
      console.error('Failed to update skill level:', skillError);
      // Continue even if skill level update fails
    }

    // Determine language from task context or use first preferred language
    let language = 'JavaScript'; // Default
    if (taskContext) {
      language = detectLanguageFromTask(taskContext);
    } else {
      // Get user profile to use preferred language
      const profile = await UserLearningProfile.findOne({
        $or: [
          { userId: user._id },
          { userId: user._id.toString() }
        ]
      });
      if (profile && profile.languagesToLearn && profile.languagesToLearn.length > 0) {
        language = profile.languagesToLearn[0];
      }
    }

    // Check if achievement should be unlocked (score >= 70)
    let achievementUnlocked = null;
    if (percentage >= 70) {
      const badge = determineBadgeLevel(percentage);
      
      if (badge) {
        try {
          // Call achievement unlock endpoint
          const unlockRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/achievements/unlock`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({
              language,
              score: percentage,
              challengeTitle: quizId || 'Quiz Completion',
              testId: `quiz-${Date.now()}`
            })
          });

          if (unlockRes.ok) {
            const unlockData = await unlockRes.json();
            if (unlockData.success) {
              achievementUnlocked = {
                badge,
                language,
                rarity: unlockData.achievement?.rarity,
                message: unlockData.message
              };
            }
          }
        } catch (achievementError) {
          console.error('Failed to unlock achievement:', achievementError);
          // Don't fail the whole request if achievement unlock fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      score: percentage,
      skillLevel: {
        old: oldSkillLevel,
        new: newSkillLevel,
        change: skillLevelChange,
        message: skillLevelChange > 0 
          ? `🎉 Level up! Your skill level increased from ${oldSkillLevel} to ${newSkillLevel}!`
          : skillLevelChange < 0
          ? `📉 Your skill level decreased from ${oldSkillLevel} to ${newSkillLevel}. Keep practicing!`
          : `Your skill level remains at ${oldSkillLevel}.`
      },
      achievement: achievementUnlocked
    }, { status: 200 });

  } catch (error) {
    console.error('Quiz result processing error:', error);
    return NextResponse.json({
      error: 'Failed to process quiz results',
      details: error.message
    }, { status: 500 });
  }
}

