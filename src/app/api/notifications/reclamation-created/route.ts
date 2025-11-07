import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notifyReclamationSubmitted } from '@/lib/notification-helper';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title } = body;

    await notifyReclamationSubmitted(session.user.id, title || 'Your reclamation');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending reclamation created notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
