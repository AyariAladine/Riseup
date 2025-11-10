import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Debug endpoint to see account collection structure
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get all accounts for this user
    const accounts = await db.collection('account').find({
      userId: user.id
    }).toArray();

    // Also check by email in accountId
    const accountsByEmail = await db.collection('account').find({
      accountId: user.email
    }).toArray();

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      accountsByUserId: accounts.map((acc: any) => ({
        id: acc.id,
        _id: acc._id?.toString(),
        userId: acc.userId,
        accountId: acc.accountId,
        providerId: acc.providerId,
        hasPassword: !!acc.password,
        passwordPrefix: acc.password?.substring(0, 10)
      })),
      accountsByEmail: accountsByEmail.map((acc: any) => ({
        id: acc.id,
        _id: acc._id?.toString(),
        userId: acc.userId,
        accountId: acc.accountId,
        providerId: acc.providerId,
        hasPassword: !!acc.password,
        passwordPrefix: acc.password?.substring(0, 10)
      }))
    });
  } catch (error: any) {
    console.error('Debug accounts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
