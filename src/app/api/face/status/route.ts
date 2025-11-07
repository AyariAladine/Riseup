import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Check if current user has face recognition enabled
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);

    const db = await connectToDatabase();
    const userCollection = db.collection('user');
    
    const dbUser = await userCollection.findOne({ 
      email: user.email 
    });

    if (!dbUser) {
      return NextResponse.json({ faceRegistered: false });
    }

    return NextResponse.json({
      faceRegistered: dbUser.faceRegistered || false,
    });
  } catch (error: any) {
    console.error('Error checking face status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check face status' },
      { status: 500 }
    );
  }
}
