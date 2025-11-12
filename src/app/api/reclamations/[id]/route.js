import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Reclamation from '@/models/Reclamation';

export async function DELETE(req, { params }) {
  try {
    console.log('🗑️ DELETE ticket request received');
    
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

    const { id: reclamationId } = params;
    console.log('📝 Deleting ticket ID:', reclamationId);

    // Find and delete the reclamation
    const reclamation = await Reclamation.findById(reclamationId);
    if (!reclamation) {
      console.log('❌ Ticket not found');
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify ownership
    if (reclamation.userId.toString() !== user._id.toString() && !user.isAdmin) {
      console.log('❌ Access denied');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the ticket
    await Reclamation.findByIdAndDelete(reclamationId);
    
    console.log('✅ Ticket deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully'
    });

  } catch (error) {
    console.error('❌ DELETE ticket error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}