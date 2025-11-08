import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    const { code, newPassword, currentPassword } = await req.json();

    console.log('Password confirm request:', { code: code ? 'present' : 'missing', newPassword: newPassword ? 'present' : 'missing', currentPassword: currentPassword ? 'present' : 'missing' });

    if (!code || !newPassword || !currentPassword) {
      console.log('Missing required fields');
      return NextResponse.json({
        error: 'Code, current password and new password are required'
      }, { status: 400 });
    }

    await connectToDatabase();
    const dbUser = await User.findById(user._id);

    console.log('User found:', dbUser ? 'yes' : 'no');
    console.log('Code in DB:', dbUser?.passwordChangeCode || 'none');
    console.log('Code received:', code);
    console.log('Code expires:', dbUser?.passwordChangeCodeExpires);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!passwordMatch) {
      return NextResponse.json({
        error: 'Current password is incorrect'
      }, { status: 400 });
    }

    // Verify code
    if (!dbUser.passwordChangeCode || dbUser.passwordChangeCode !== code) {
      return NextResponse.json({
        error: 'Invalid verification code'
      }, { status: 400 });
    }

    // Check if code expired
    if (!dbUser.passwordChangeCodeExpires || dbUser.passwordChangeCodeExpires < new Date()) {
      return NextResponse.json({
        error: 'Verification code expired. Please request a new one.'
      }, { status: 400 });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json({
        error: 'New password must be at least 6 characters'
      }, { status: 400 });
    }

    // Update password
    dbUser.password = await bcrypt.hash(newPassword, 10);
    dbUser.passwordChangeCode = undefined;
    dbUser.passwordChangeCodeExpires = undefined;
    await dbUser.save();

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (e) {
    console.error('Password change confirm error:', e);
    return NextResponse.json({
      error: e?.message || 'Server error'
    }, { status: 500 });
  }
}
