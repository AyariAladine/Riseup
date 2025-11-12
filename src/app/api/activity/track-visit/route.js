import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * POST /api/activity/track-visit
 * Track a user's dashboard visit (login/activity)
 * This creates a simple activity record for the current day
 */
export async function POST(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { db } = await connectToDatabase();

    const userId = user._id || user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // Upsert activity record for today
    await db.collection('user_activity').updateOne(
      {
        userId: userId.toString(),
        date: todayString
      },
      {
        $set: {
          userId: userId.toString(),
          date: todayString,
          lastVisit: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Track visit error:', error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

