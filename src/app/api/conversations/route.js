import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';

// GET: List all conversations for a chat type
export async function GET(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatType = searchParams.get('type') || 'learn';
    const conversationId = searchParams.get('id');

    await connectToDatabase();

    // If requesting a specific conversation
    if (conversationId) {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: user._id,
        chatType
      }).lean();

      console.log('Fetched conversation from DB:', conversation);

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: conversation._id.toString(),
        title: conversation.title,
        messages: conversation.messages || [],
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      });
    }

    // Otherwise, list all conversations
    const conversations = await Conversation.find({
      userId: user._id,
      chatType
    })
      .select('_id title createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      conversations: conversations.map(c => ({
        id: c._id.toString(),
        title: c.title,
        messageCount: c.messages?.length || 0,
        lastMessage: c.messages?.[c.messages.length - 1]?.content?.substring(0, 50) || '',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    });

  } catch (error) {
    console.error('GET /api/conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new conversation or update existing
export async function POST(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatType, conversationId, title, messages } = body;

    if (!chatType || !['learn', 'assistant'].includes(chatType)) {
      return NextResponse.json({ error: 'Invalid chatType' }, { status: 400 });
    }

    await connectToDatabase();

    // Update existing conversation (append new messages)
    if (conversationId) {
      const conversation = await Conversation.findOne({ _id: conversationId, userId: user._id, chatType });
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      // Only append new messages that are not already in the conversation
      let newMessages = Array.isArray(messages) ? messages : [];
      // Find the index of the last message in the existing conversation
      let lastId = conversation.messages?.length ? conversation.messages[conversation.messages.length - 1]._id?.toString() : null;
      let toAppend = newMessages;
      if (lastId) {
        const lastIdx = newMessages.findIndex(m => m._id === lastId);
        if (lastIdx !== -1) {
          toAppend = newMessages.slice(lastIdx + 1);
        }
      }
      conversation.title = title || conversation.title;
      conversation.messages = [...(conversation.messages || []), ...toAppend];
      conversation.updatedAt = new Date();
      await conversation.save();
      return NextResponse.json({
        success: true,
        conversation: {
          id: conversation._id.toString(),
          title: conversation.title,
          messageCount: conversation.messages?.length || 0
        }
      });
    }

    // Create new conversation
    const newConversation = await Conversation.create({
      userId: user._id,
      chatType,
      title: title || 'New Conversation',
      messages: messages || []
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: newConversation._id.toString(),
        title: newConversation.title,
        messageCount: newConversation.messages?.length || 0
      }
    });

  } catch (error) {
    console.error('POST /api/conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a conversation
export async function DELETE(request) {
  try {
    const { user } = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    const chatType = searchParams.get('type');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await Conversation.deleteOne({
      _id: conversationId,
      userId: user._id,
      chatType
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('DELETE /api/conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
