import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

// Legacy route - password changes should use Better Auth's changePassword instead
export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    const db = await connectToDatabase();
    const userCollection = db.collection('user');

    const dbUser = await userCollection.findOne({ email: user.email });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save code to user (expires in 10 minutes)
    await userCollection.updateOne(
      { email: user.email },
      { 
        $set: { 
          passwordChangeCode: verificationCode,
          passwordChangeCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          updatedAt: new Date()
        } 
      }
    );

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"RiseUP" <${process.env.GMAIL_USER}>`,
      to: dbUser.email,
      subject: 'Password Change Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0b0d0f;">Password Change Verification</h2>
          <p>Hello ${dbUser.name},</p>
          <p>You requested to change your password. Use this verification code:</p>
          <div style="background: #f6f8fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #0b0d0f; font-size: 36px; margin: 0; letter-spacing: 8px;">${verificationCode}</h1>
          </div>
          <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">RiseUP - Task Management & Learning</p>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email' 
    });
  } catch (e) {
    console.error('Password change start error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Server error' 
    }, { status: 500 });
  }
}
