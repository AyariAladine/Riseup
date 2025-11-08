import { rateLimit } from '@/lib/rateLimiter';
import { getUserFromRequest } from '@/lib/auth';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`tasks:summary:${ip}`, 10, 60 * 1000); // 10 requests per minute
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { user } = await getUserFromRequest(req);
    const { taskId, title, description } = await req.json();

    if (!taskId || !title) {
      return new Response(JSON.stringify({ error: 'Task ID and title are required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const groq = new Groq({ apiKey: groqKey });

    console.log('Starting Groq API streaming for task summary...');

    // Generate a summary with streaming
    const prompt = `Based on this completed task, generate a brief summary (2-3 sentences) of what was likely accomplished:

Task Title: "${title}"
${description ? `Description: "${description}"` : ''}

Focus on the outcome and value delivered. Keep it professional and concise.`;

    try {
      const stream = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Updated to current Groq model
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes completed tasks professionally.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.3,
        stream: true, // Enable streaming
      });

      // Create a ReadableStream for SSE
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                // Send SSE formatted data
                const data = `data: ${JSON.stringify({ content })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
            // Send done signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            console.log('Groq API streaming completed successfully');
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } catch (groqError) {
      console.error('Groq API failed:', groqError);
      // Fallback to simple summary
      const fallbackSummary = `Task "${title}" has been completed successfully. ${description ? `The task involved: ${description}` : 'All objectives were met and the work is now finished.'}`;
      
      return new Response(JSON.stringify({ summary: fallbackSummary }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Task summary generation failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
