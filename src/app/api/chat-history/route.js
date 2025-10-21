import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    
    const chatType = new URL(request.url).searchParams.get('type') || 'learn';
    
    let history = await ChatHistory.findOne({ 
      userId: user.id, 
      chatType 
    }).lean();

    if (!history) {
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: history.messages || [] });
  } catch (error) {
    console.error('Error loading chat history:', error);
    return NextResponse.json({ error: 'Failed to load chat history' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { chatType, messages } = body;

    if (!chatType || !['learn', 'assistant'].includes(chatType)) {
      return NextResponse.json({ error: 'Invalid chat type' }, { status: 400 });
    }

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 });
    }

    await connectToDatabase();

    // Update or create chat history
    const history = await ChatHistory.findOneAndUpdate(
      { userId: user.id, chatType },
      { 
        $set: { 
          messages,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, messageCount: history.messages.length });
  } catch (error) {
    console.error('Error saving chat history:', error);
    return NextResponse.json({ error: 'Failed to save chat history' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const chatType = new URL(request.url).searchParams.get('type') || 'learn';

    await connectToDatabase();

    await ChatHistory.deleteOne({ userId: user.id, chatType });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 });
  }
}
