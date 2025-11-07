import { NextResponse } from 'next/server';
import { sendFirebaseNotificationToUser, broadcastFirebaseNotification } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, body: messageBody, icon, url, data, broadcast } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    const payload = {
      title,
      body: messageBody,
      icon: icon || '/icon.svg',
      url: url || '/',
      data: data || {},
    };

    let result;
    if (broadcast) {
      // Send to all users
      console.log('📢 Broadcasting notification to all users');
      result = await broadcastFirebaseNotification(payload);
    } else if (userId) {
      // Send to specific user
      console.log(`👤 Sending notification to user: ${userId}`);
      result = await sendFirebaseNotificationToUser(userId, payload);
    } else {
      return NextResponse.json(
        { error: 'Either userId or broadcast=true must be provided' },
        { status: 400 }
      );
    }

    console.log('📊 Send result:', result);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason || 'Failed to send notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      reason: result.reason, // Include reason (like NO_SUBSCRIPTIONS)
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
