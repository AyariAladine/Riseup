import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimiter';
import { getUserFromRequest } from '@/lib/auth';
import Groq from 'groq-sdk';

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:summary:${ip}`, 10, 60 * 1000); // 10 requests per minute
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { user } = await getUserFromRequest(req);
    const { taskId, title, description } = await req.json();

    if (!taskId || !title) {
      return NextResponse.json({ error: 'Task ID and title are required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // For testing, return a mock summary
    const summary = `Task "${title}" has been completed successfully. ${description ? `The task involved: ${description}` : 'All objectives were met and the work is now finished.'}`;

    return NextResponse.json({ summary }, { status: 200 });

  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Task summary generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}