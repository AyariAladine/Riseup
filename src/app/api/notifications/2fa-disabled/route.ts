import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { notify2FADisabled } from '@/lib/notification-helper';

export const dynamic = 'force-dynamic';

/**
 * Send Firebase notification when user disables 2FA
 */
export async function POST(req: Request) {
  try {
    const { user } = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Send Firebase push notification
    await notify2FADisabled(user.id);
    
    console.log(`✅ 2FA disabled notification sent to user ${user.id}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending 2FA disabled notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
