// app/api/auth/set-password-with-face/route.js
import { NextResponse } from 'next/server';
import { getUserFromRequest, auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, oldPassword, newPassword, verificationCode, isPremium } = await req.json();
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const userCollection = db.collection('user');
    const accountCollection = db.collection('account');

    // Find user by userId (string)
    let dbUser;
    try {
      console.log('[API] Received userId:', userId);
      let objectId;
      if (userId) {
        if (typeof userId === 'string') {
          if (/^[a-fA-F0-9]{24}$/.test(userId)) {
objectId = new ObjectId(userId);
            console.log('[API] Converted userId to ObjectId:', objectId);
          } else {
            console.error('[API] userId string is not a valid ObjectId:', userId);
            return NextResponse.json({ error: 'Invalid userId format (not 24 hex chars)' }, { status: 400 });
          }
        } else {
          objectId = userId;
        }
        dbUser = await userCollection.findOne({ _id: objectId });
        console.log('[API] userCollection.findOne result:', dbUser);
      } else {
        dbUser = await userCollection.findOne({ _id: user._id });
        console.log('[API] Fallback to session user._id:', user._id);
      }
    } catch (e) {
      console.error('[API] Exception during userId lookup:', e);
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }
    if (!dbUser) {
      console.error('[API] No user found for ObjectId:', objectId || user._id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let verified = false;

    // Premium: verify code
    if (isPremium && verificationCode) {
      if (!dbUser.passwordChangeCode || dbUser.passwordChangeCode !== verificationCode)
        return NextResponse.json({ error: 'Invalid verification code', status: 400 });

      if (!dbUser.passwordChangeCodeExpires || new Date(dbUser.passwordChangeCodeExpires) < new Date())
        return NextResponse.json({ error: 'Verification code expired', status: 400 });

      verified = true;
    }
    // Normal user: check old password
    else if (!isPremium && oldPassword) {
      const match = await bcrypt.compare(oldPassword, dbUser.password);
      if (!match) return NextResponse.json({ error: 'Current password incorrect', status: 400 });
      verified = true;
    } else {
      return NextResponse.json({ error: isPremium ? 'Verification code required' : 'Current password required', status: 400 });
    }

    if (!verified) return NextResponse.json({ error: 'Verification failed', status: 400 });

    // Use Better Auth's built-in changePassword API for consistent password update
    try {
      const result = await auth.api.changePassword({
        body: {
          newPassword,
          currentPassword: oldPassword,
          userId: dbUser._id.toString(),
          email: dbUser.email,
          faceVerified: true,
          revokeOtherSessions: false
        },
        headers: req.headers
      });
      if (result?.error) {
        return NextResponse.json({ error: result.error.message || 'Password change failed' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error('Better Auth changePassword error:', err);
      return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
    }
  } catch (e) {
    console.error('Password change error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
