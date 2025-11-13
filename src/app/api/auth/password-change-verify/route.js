// app/api/auth/password-change-verify/route.js
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await connectToDatabase();
    const userCollection = db.collection('user');

    const dbUser = await userCollection.findOne({ email: user.email });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await userCollection.updateOne(
      { _id: dbUser._id },
      {
        $set: {
          passwordChangeCode: verificationCode,
          passwordChangeCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          updatedAt: new Date(),
        },
      }
    );

    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      });

      await transporter.sendMail({
        from: `"RiseUP" <${process.env.GMAIL_USER}>`,
        to: dbUser.email,
        subject: 'Password Change Verification Code',
        html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                <h2>🔐 Password Change Verification</h2>
                <p>Hello ${dbUser.name || 'there'},</p>
                <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 12px; text-align: center; font-size: 32px; letter-spacing: 10px;">
                  ${verificationCode}
                </div>
                <p>⏰ This code expires in 10 minutes.</p>
              </div>`,
      });
    }

    return NextResponse.json({ success: true, message: 'Verification code sent to email' });
  } catch (e) {
    console.error('Password verification error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to send verification code' }, { status: 500 });
  }
}
