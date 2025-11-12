import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import Achievement from '@/models/Achievement';
import Task from '@/models/Task';
import UserTaskInteraction from '@/models/UserTaskInteraction';
import UserLearningProfile from '@/models/UserLearningProfile';
import { NextResponse } from 'next/server';

/**
 * GET /api/stats/user
 * Get comprehensive user statistics for the leaderboard stats section
 */
export async function GET(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = user._id || user.id;
    const userIdString = userId.toString();

    // Get user achievements
    const achievements = await Achievement.find({
      $or: [
        { userId: userId },
        { userId: userIdString }
      ]
    }).lean();

    // Get user tasks
    const tasks = await Task.find({
      $or: [
        { user: userId },
        { userId: userIdString }
      ]
    }).lean();

    // Get user interactions
    const interactions = await UserTaskInteraction.find({
      userId: userIdString
    }).lean();

    // Get user learning profile
    const profile = await UserLearningProfile.findOne({
      $or: [
        { userId: userId },
        { userId: userIdString }
      ]
    }).lean();

    // Calculate stats
    const totalBadges = achievements.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed || t.status === 'completed').length;
    const totalQuizzes = interactions.filter(i => i.taskTitle?.toLowerCase().includes('quiz')).length;
    
    // Score stats
    const scores = achievements.map(a => a.score).filter(s => s !== null && s !== undefined);
    const taskScores = tasks.map(t => t.score).filter(s => s !== null && s !== undefined);
    const allScores = [...scores, ...taskScores];
    const avgScore = allScores.length > 0 
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;
    const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;

    // Badge breakdown
    const badgeBreakdown = {
      diamond: achievements.filter(a => a.badge === 'Diamond').length,
      gold: achievements.filter(a => a.badge === 'Gold').length,
      silver: achievements.filter(a => a.badge === 'Silver').length,
      bronze: achievements.filter(a => a.badge === 'Bronze').length
    };

    // Language stats
    const languages = [...new Set(achievements.map(a => a.language).filter(Boolean))];
    const languageStats = languages.map(lang => {
      const langAchievements = achievements.filter(a => a.language === lang);
      return {
        language: lang,
        badges: langAchievements.length,
        avgScore: langAchievements.length > 0
          ? Math.round(langAchievements.reduce((sum, a) => sum + (a.score || 0), 0) / langAchievements.length)
          : 0,
        bestBadge: langAchievements.length > 0
          ? langAchievements.reduce((best, a) => {
              const badgeOrder = { Diamond: 4, Gold: 3, Silver: 2, Bronze: 1 };
              return badgeOrder[a.badge] > badgeOrder[best.badge] ? a : best;
            }, langAchievements[0]).badge
          : null
      };
    }).sort((a, b) => b.badges - a.badges);

    // Time spent
    const totalTimeSpent = interactions.reduce((sum, i) => sum + (i.timeSpent || 0), 0);
    const hoursSpent = Math.round(totalTimeSpent / 60 * 10) / 10;

    // Completion rate
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Skill level
    const skillLevel = profile?.skillLevel || 1;

    // Rank calculation (approximate - would need full leaderboard query for exact)
    // For now, we'll calculate based on total badges
    const usersWithMoreBadges = await Achievement.aggregate([
      {
        $group: {
          _id: '$userId',
          totalBadges: { $sum: 1 }
        }
      },
      {
        $match: {
          totalBadges: { $gt: totalBadges }
        }
      },
      {
        $count: 'count'
      }
    ]);
    const approximateRank = (usersWithMoreBadges[0]?.count || 0) + 1;

    // Streak (days with at least one completed task)
    const completedDates = tasks
      .filter(t => t.completedAt)
      .map(t => new Date(t.completedAt).toDateString());
    const uniqueDays = new Set(completedDates).size;

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTasks = tasks.filter(t => 
      t.completedAt && new Date(t.completedAt) >= sevenDaysAgo
    ).length;
    const recentAchievements = achievements.filter(a => 
      a.unlockedAt && new Date(a.unlockedAt) >= sevenDaysAgo
    ).length;

    return NextResponse.json({
      success: true,
      stats: {
        // Overview
        totalBadges,
        totalTasks,
        completedTasks,
        completionRate,
        avgScore,
        bestScore,
        skillLevel,
        approximateRank,
        
        // Badges
        badgeBreakdown,
        
        // Languages
        languages: languages.length,
        languageStats,
        
        // Activity
        totalTimeSpent: hoursSpent,
        totalQuizzes,
        uniqueDays,
        recentActivity: {
          tasks: recentTasks,
          achievements: recentAchievements
        },
        
        // Performance
        totalInteractions: interactions.length,
        totalAttempts: interactions.reduce((sum, i) => sum + (i.attempts || 1), 0)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({
      error: 'Failed to fetch user stats',
      details: error.message
    }, { status: 500 });
  }
}

