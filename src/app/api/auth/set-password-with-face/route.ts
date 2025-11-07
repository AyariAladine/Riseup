import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
// @ts-ignore - bcryptjs doesn't have proper TypeScript definitions
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // Get the session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPassword } = await req.json();

    // Validate password
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    
    // Check if user is premium (has face recognition enabled)
    const user = await db.collection('users').findOne({ 
      _id: session.user.id 
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isPremium) {
      return NextResponse.json({ 
        error: 'Face recognition is only available for premium users' 
      }, { status: 403 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.collection('users').updateOne(
      { _id: session.user.id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );

    // Send password changed notification
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/notifications/password-changed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: session.user.id,
          method: 'face-verification'
        })
      });
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error('Failed to send notification:', notifError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password set successfully with face verification' 
    });
    
  } catch (error) {
    console.error('Error setting password with face:', error);
    return NextResponse.json({ 
      error: 'Failed to set password' 
    }, { status: 500 });
  }
}
