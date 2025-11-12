import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Reclamation from '@/models/Reclamation';
import Groq from 'groq-sdk';
import { rateLimit } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rl = rateLimit(`reclamation-chat:${ip}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

    const body = await req.json();
    const { reclamationId, message } = body;

    if (!reclamationId || !message) {
      return NextResponse.json(
        { error: 'Missing reclamationId or message' },
        { status: 400 }
      );
    }

    if (message.length < 3 || message.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be between 3 and 2000 characters' },
        { status: 400 }
      );
    }

    // Fetch reclamation
    const reclamation = await Reclamation.findById(reclamationId);
    if (!reclamation) {
      return NextResponse.json(
        { error: 'Reclamation not found' },
        { status: 404 }
      );
    }

    // Verify ownership or admin status
    if (
      reclamation.userId.toString() !== user._id.toString() &&
      !user.isAdmin
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Add user message to chat history
    reclamation.chatHistory.push({
      role: 'user',
      content: message,
      sourceModel: 'system',
      timestamp: new Date(),
    });

    // Get AI response using GROQ
    let aiResponse = "I understand you're having an issue. Let me help you with that!";
    let analysis = null;

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });

        // Build chat history for context - use recent conversation
        const recentMessages = reclamation.chatHistory
          .slice(-8)
          .map((msg) => ({
            role: msg.role === 'admin' ? 'assistant' : msg.role,
            content: msg.content,
          }));

        const systemPrompt = `You are a friendly and helpful AI support assistant for RiseUP e-learning platform. 
You are having a real conversation with a user about their issue.

USER'S ISSUE:
- Title: ${reclamation.title}
- Original Description: ${reclamation.description}
- Category: ${reclamation.category}
- Current Status: ${reclamation.status}

HOW TO RESPOND:
1. Be conversational and natural - like a human support agent
2. Respond directly to what the user just said
3. Ask follow-up questions to understand better
4. Provide helpful suggestions and solutions
5. Show empathy and understanding
6. Keep your response concise but meaningful
7. If you need more info, ask specific questions
8. Maintain a positive and helpful tone

IMPORTANT: Respond naturally in plain text. Do NOT use JSON format. Just have a normal conversation.

Recent conversation context:
${recentMessages.slice(0, -1).map((msg) => `${msg.role}: ${msg.content}`).join('\n')}

Now respond to the user's latest message naturally.`;

        console.log('🤖 Calling GROQ AI with message:', message);
        
        const response = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            ...recentMessages
          ],
          temperature: 0.8,
          max_tokens: 500,
          top_p: 0.9,
        });

        const responseText = response.choices?.[0]?.message?.content || '';
        console.log('✅ AI Response:', responseText);

        aiResponse = responseText.trim() || aiResponse;

        // Simple analysis based on conversation
        analysis = {
          classification: reclamation.category,
          priority: reclamation.priority,
          sentiment: detectSentiment(message),
          needs_admin: message.toLowerCase().includes('admin') || message.toLowerCase().includes('manager'),
          needs_technical: message.toLowerCase().includes('technical') || message.toLowerCase().includes('bug') || message.toLowerCase().includes('error')
        };

        // Update reclamation with simple analysis
        reclamation.aiAnalysis = {
          intent: analysis.classification,
          sentiment: analysis.sentiment,
          priority_suggested: analysis.priority,
          confidence: 0.7,
        };

      } catch (groqError) {
        console.error('GROQ error:', groqError);
        const fallbackResponses = [
          "I understand you're reaching out for help. Could you tell me more about what you're experiencing?",
          "Thanks for your message! I'd be happy to help you with this issue. What specific problem are you facing?",
          "I see you're having an issue. Let me help you work through it. Can you provide more details?",
          "I'm here to assist you! What seems to be the main challenge you're facing right now?"
        ];
        aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
    } else {
      console.log('⚠️ No GROQ API key found');
      aiResponse = "I'm here to help! Our support team will assist you shortly. In the meantime, could you describe the issue in more detail?";
    }

    // Add AI response to chat history
    reclamation.chatHistory.push({
      role: 'assistant',
      content: aiResponse,
      sourceModel: 'groq',
      timestamp: new Date(),
    });

    // Update reclamation status if it was pending
    if (reclamation.status === 'pending') {
      reclamation.status = 'in-progress';
    }

    // Save reclamation
    await reclamation.save();
    console.log('💾 Chat history updated');

    return NextResponse.json({
      success: true,
      response: aiResponse,
      analysis,
      reclamation: {
        _id: reclamation._id,
        status: reclamation.status,
        priority: reclamation.priority,
        category: reclamation.category,
        suggestedSolutions: reclamation.suggestedSolutions || [],
        chatHistory: reclamation.chatHistory,
      },
    });
  } catch (e) {
    console.error('POST /api/reclamations/chat error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}

// Helper function to detect sentiment
function detectSentiment(text) {
  const positiveWords = ['good', 'great', 'thanks', 'helpful', 'working', 'fixed', 'solved', 'excellent', 'perfect'];
  const negativeWords = ['bad', 'broken', 'error', 'issue', 'problem', 'not working', 'failed', 'terrible', 'awful'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  let negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}