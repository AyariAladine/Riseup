import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { notifyPasswordChanged } from '@/lib/notification-helper';

export const dynamic = 'force-dynamic';

/**
 * Send Firebase notification when user changes password
 */
export async function POST(req: Request) {
  try {
    const { user } = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Send Firebase push notification
    await notifyPasswordChanged(user.id);
    
    console.log(`✅ Password changed notification sent to user ${user.id}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending password changed notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
