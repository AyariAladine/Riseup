import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import Task from '@/models/Task';
import UserTaskInteraction from '@/models/UserTaskInteraction';
import Achievement from '@/models/Achievement';
import { NextResponse } from 'next/server';

/**
 * GET /api/activity/weekly?weekOffset=0
 * Get user activity for a specific week (0 = current week, 1 = last week, etc.)
 */
export async function GET(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get('weekOffset') || '0', 10);

    const userId = user._id || user.id;
    const userIdString = userId.toString();

    // Calculate week start (Monday) and end (Sunday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Convert to Monday = 0
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday - (weekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get all activity dates from various sources
    const activityDates = new Set();

    // 0. Dashboard visits (user_activity collection)
    const { db } = await connectToDatabase();
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    const visits = await db.collection('user_activity').find({
      userId: userIdString,
      date: {
        $gte: weekStartStr,
        $lte: weekEndStr
      }
    }).toArray();

    visits.forEach(visit => {
      if (visit.date) {
        const visitDate = new Date(visit.date + 'T00:00:00');
        activityDates.add(visitDate.toDateString());
      }
    });

    // 1. Task interactions (viewed, started, completed)
    const interactions = await UserTaskInteraction.find({
      userId: userIdString,
      $or: [
        { firstViewedAt: { $gte: weekStart, $lte: weekEnd } },
        { startedAt: { $gte: weekStart, $lte: weekEnd } },
        { completedAt: { $gte: weekStart, $lte: weekEnd } },
        { createdAt: { $gte: weekStart, $lte: weekEnd } }
      ]
    }).lean();

    interactions.forEach(interaction => {
      if (interaction.firstViewedAt) {
        const date = new Date(interaction.firstViewedAt).toDateString();
        activityDates.add(date);
      }
      if (interaction.startedAt) {
        const date = new Date(interaction.startedAt).toDateString();
        activityDates.add(date);
      }
      if (interaction.completedAt) {
        const date = new Date(interaction.completedAt).toDateString();
        activityDates.add(date);
      }
      if (interaction.createdAt) {
        const date = new Date(interaction.createdAt).toDateString();
        activityDates.add(date);
      }
    });

    // 2. Tasks created/updated
    const tasks = await Task.find({
      $and: [
        {
          $or: [
            { user: userId },
            { user: userIdString },
            { userId: userId },
            { userId: userIdString }
          ]
        },
        {
          $or: [
            { createdAt: { $gte: weekStart, $lte: weekEnd } },
            { updatedAt: { $gte: weekStart, $lte: weekEnd } },
            { completedAt: { $gte: weekStart, $lte: weekEnd } }
          ]
        }
      ]
    }).lean();

    tasks.forEach(task => {
      if (task.createdAt) {
        const date = new Date(task.createdAt).toDateString();
        activityDates.add(date);
      }
      if (task.updatedAt) {
        const date = new Date(task.updatedAt).toDateString();
        activityDates.add(date);
      }
      if (task.completedAt) {
        const date = new Date(task.completedAt).toDateString();
        activityDates.add(date);
      }
    });

    // 3. Achievements unlocked
    const achievements = await Achievement.find({
      $or: [
        { userId: userId },
        { userId: userIdString }
      ],
      unlockedAt: { $gte: weekStart, $lte: weekEnd }
    }).lean();

    achievements.forEach(achievement => {
      if (achievement.unlockedAt) {
        const date = new Date(achievement.unlockedAt).toDateString();
        activityDates.add(date);
      }
    });

    // Build week data (7 days, Monday to Sunday)
    const weekData = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayString = day.toDateString();
      const isActive = activityDates.has(dayString);
      
      weekData.push({
        date: day.toISOString().split('T')[0],
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: day.getDate(),
        isActive,
        isToday: dayString === new Date().toDateString()
      });
    }

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weekOffset,
      days: weekData,
      totalActiveDays: weekData.filter(d => d.isActive).length
    }, { status: 200 });

  } catch (error) {
    console.error('Weekly activity error:', error);
    return NextResponse.json({
      error: 'Failed to fetch weekly activity',
      details: error.message
    }, { status: 500 });
  }
}

