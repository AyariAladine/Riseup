import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Reclamation from '@/models/Reclamation';

export async function DELETE(req, { params }) {
  try {
    console.log('🗑️ DELETE request received');
    
    // For testing - remove auth temporarily
    // const { user } = await getUserFromRequest(req);
    
    await connectToDatabase();

    const { id: reclamationId } = params;
    console.log('📝 Reclamation ID:', reclamationId);

    // Fetch reclamation
    const reclamation = await Reclamation.findById(reclamationId);
    if (!reclamation) {
      console.log('❌ Reclamation not found');
      return NextResponse.json({ error: 'Reclamation not found' }, { status: 404 });
    }

    // For testing - skip auth check
    // if (reclamation.userId.toString() !== user._id.toString() && !user.isAdmin) {
    //   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    // }

    console.log('🧹 Clearing chat history...');
    console.log('Before:', reclamation.chatHistory.length, 'messages');
    
    // Clear the chat history
    reclamation.chatHistory = [];
    
    await reclamation.save();
    
    console.log('✅ Chat cleared successfully');
    console.log('After:', reclamation.chatHistory.length, 'messages');

    return NextResponse.json({
      success: true,
      message: 'Chat cleared successfully',
      chatHistory: reclamation.chatHistory
    });

  } catch (error) {
    console.error('❌ DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear chat' },
      { status: 500 }
    );
  }
}

// Also add GET method
export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id: reclamationId } = params;

    const reclamation = await Reclamation.findById(reclamationId);
    if (!reclamation) {
      return NextResponse.json({ error: 'Reclamation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      chatHistory: reclamation.chatHistory || []
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}