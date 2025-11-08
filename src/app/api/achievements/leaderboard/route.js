import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import Achievement from '@/models/Achievement';
import User from '@/models/User';

/**
 * GET /api/achievements/leaderboard?language=Python&limit=10
 * Fetch top achievers leaderboard, optionally filtered by language
 */
export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    let query = {};
    if (language) {
      query.language = language;
    }

    // Aggregate achievements by user to get top performers
    const leaderboard = await Achievement.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$userId',
          totalBadges: { $sum: 1 },
          totalScore: { $sum: '$score' },
          avgScore: { $avg: '$score' },
          languages: { $addToSet: '$language' },
          badgeTypes: { $addToSet: '$badge' },
          diamondBadges: {
            $sum: { $cond: [{ $eq: ['$badge', 'Diamond'] }, 1, 0] },
          },
          goldBadges: {
            $sum: { $cond: [{ $eq: ['$badge', 'Gold'] }, 1, 0] },
          },
          silverBadges: {
            $sum: { $cond: [{ $eq: ['$badge', 'Silver'] }, 1, 0] },
          },
          bronzeBadges: {
            $sum: { $cond: [{ $eq: ['$badge', 'Bronze'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalBadges: -1, totalScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $project: {
          _id: 1,
          totalBadges: 1,
          totalScore: 1,
          avgScore: 1,
          languages: 1,
          badgeTypes: 1,
          diamondBadges: 1,
          goldBadges: 1,
          silverBadges: 1,
          bronzeBadges: 1,
          userName: { $arrayElemAt: ['$userInfo.name', 0] },
          userAvatar: { $arrayElemAt: ['$userInfo.avatar', 0] },
          userEmail: { $arrayElemAt: ['$userInfo.email', 0] },
        },
      },
    ]);

    // Add rank
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        leaderboard: rankedLeaderboard,
        language: language || 'All',
        count: rankedLeaderboard.length,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Leaderboard error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch leaderboard' }),
      { status: 500 }
    );
  }
}
