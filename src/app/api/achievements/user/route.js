import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import Achievement from '@/models/Achievement';
import User from '@/models/User';

/**
 * GET /api/achievements/user
 * Fetch all achievements for the authenticated user
 */
export async function GET(req) {
  try {
    await connectToDatabase();
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Fetch user achievements sorted by most recent
    const achievements = await Achievement.find({ userId: user._id })
      .sort({ unlockedAt: -1 })
      .lean();

    // Fetch user info for badge count
    const userDoc = await User.findById(user._id).lean();

    // Group achievements by language
    const achievementsByLanguage = {};
    achievements.forEach((achievement) => {
      if (!achievementsByLanguage[achievement.language]) {
        achievementsByLanguage[achievement.language] = [];
      }
      achievementsByLanguage[achievement.language].push(achievement);
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalBadges: achievements.length,
        achievements,
        achievementsByLanguage,
        userStats: {
          totalBadgesEarned: userDoc?.totalBadgesEarned || 0,
          walletAddress: userDoc?.walletAddress || null,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Fetch achievements error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch achievements' }),
      { status: 500 }
    );
  }
}
