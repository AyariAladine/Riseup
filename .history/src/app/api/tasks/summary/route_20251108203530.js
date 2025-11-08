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

    const groq = new Groq({ apiKey: groqKey });

    console.log('Calling Groq API for task summary generation...');

    // Generate a summary of what was accomplished
    const prompt = `Based on this completed task, generate a brief summary (2-3 sentences) of what was likely accomplished:

Task Title: "${title}"
${description ? `Description: "${description}"` : ''}

Focus on the outcome and value delivered. Keep it professional and concise.`;

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192', // Use a valid Groq model
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes completed tasks professionally.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const summary = response.choices?.[0]?.message?.content?.trim() || 'Task completed successfully.';
    console.log('Groq API response successful, summary generated');

    return NextResponse.json({ summary }, { status: 200 });

  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Task summary generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}