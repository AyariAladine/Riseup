import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Fix/cleanup credential accounts - removes wrong accounts and ensures correct structure
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Delete any credential accounts that don't match this user
    const deleteResult = await db.collection('account').deleteMany({
      providerId: 'credential',
      userId: { $ne: user.id }
    });

    console.log('🗑️ Deleted wrong credential accounts:', deleteResult.deletedCount);

    // Also delete credential account for this user if accountId is wrong
    const wrongAccount = await db.collection('account').findOne({
      userId: user.id,
      providerId: 'credential',
      accountId: { $ne: user.email }
    });

    if (wrongAccount) {
      await db.collection('account').deleteOne({ _id: wrongAccount._id });
      console.log('🗑️ Deleted credential account with wrong accountId');
    }

    return NextResponse.json({
      success: true,
      message: 'Credential accounts cleaned up',
      deletedCount: deleteResult.deletedCount + (wrongAccount ? 1 : 0)
    });
  } catch (error: any) {
    console.error('Cleanup accounts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup accounts' },
      { status: 500 }
    );
  }
}
