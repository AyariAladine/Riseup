import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import GradingConversation from '@/models/GradingConversation';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/grading-history
 * Fetch grading conversations for the authenticated user
 */
export async function GET(req) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const taskId = searchParams.get('taskId');

    // Fetch specific conversation
    if (id) {
      console.log('📖 Fetching conversation by ID:', id, 'for user:', user._id);
      const conversation = await GradingConversation.findOne({
        _id: id,
        userId: user._id
      }).lean();

      if (!conversation) {
        console.log('❌ Conversation not found:', id);
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404 }
        );
      }

      console.log('✅ Conversation found:', {
        id: conversation._id.toString(),
        title: conversation.title,
        messageCount: conversation.messages?.length || 0,
        messages: conversation.messages
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          id: conversation._id.toString(),
          _id: conversation._id.toString(),
          userId: conversation.userId.toString(),
          taskId: conversation.taskId?.toString() || null,
          title: conversation.title,
          messages: conversation.messages || [],
          score: conversation.score,
          passed: conversation.passed,
          taskCompleted: conversation.taskCompleted,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
        }),
        { status: 200 }
      );
    }

    // Fetch conversations for a specific task
    if (taskId) {
      const conversations = await GradingConversation.find({
        userId: user._id,
        taskId
      })
      .sort({ createdAt: -1 })
      .lean();

      return new Response(
        JSON.stringify({ 
          success: true, 
          conversations: conversations.map(c => ({
            ...c,
            _id: c._id.toString(),
            userId: c.userId.toString(),
            taskId: c.taskId?.toString() || null,
          }))
        }),
        { status: 200 }
      );
    }

    // Fetch all conversations for user
    const conversations = await GradingConversation.find({ userId: user._id })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversations: conversations.map(c => ({
          id: c._id.toString(),
          _id: c._id.toString(),
          userId: c.userId.toString(),
          taskId: c.taskId?.toString() || null,
          title: c.title,
          messages: c.messages,
          lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 100) || '',
          messageCount: c.messages.length,
          score: c.score,
          passed: c.passed,
          taskCompleted: c.taskCompleted,
          createdAt: c.createdAt,
          lastMessageAt: c.lastMessageAt,
        }))
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Grading history GET error:', err);
    
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to fetch grading history' }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/grading-history
 * Create or update a grading conversation
 */
export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { id, taskId, title, messages, score, passed, taskCompleted } = body;

    // Update existing conversation
    if (id) {
      const conversation = await GradingConversation.findOneAndUpdate(
        { _id: id, userId: user._id },
        {
          $set: {
            messages,
            lastMessageAt: new Date(),
            ...(title && { title }),
            ...(typeof score === 'number' && { score }),
            ...(typeof passed === 'boolean' && { passed }),
            ...(typeof taskCompleted === 'boolean' && { taskCompleted }),
          }
        },
        { new: true }
      );

      if (!conversation) {
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          id: conversation._id.toString(),
          conversation 
        }),
        { status: 200 }
      );
    }

    // Create new conversation
    const conversation = await GradingConversation.create({
      userId: user._id,
      taskId: taskId || null,
      title: title || 'Challenge Session',
      messages: messages || [],
      score: score || null,
      passed: passed || null,
      taskCompleted: taskCompleted || false,
      lastMessageAt: new Date()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: conversation._id.toString(),
        conversation 
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error('Grading history POST error:', err);
    
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to save grading history' }),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grading-history?id=xxx
 * Delete a grading conversation
 */
export async function DELETE(req) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID required' }),
        { status: 400 }
      );
    }

    const result = await GradingConversation.deleteOne({
      _id: id,
      userId: user._id
    });

    if (result.deletedCount === 0) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Grading history DELETE error:', err);
    
    if (err.message === 'NO_TOKEN' || err.message === 'INVALID_TOKEN') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to delete grading history' }),
      { status: 500 }
    );
  }
}
