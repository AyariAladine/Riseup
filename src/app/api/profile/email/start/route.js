import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { EmailChangeStartSchema } from '@/features/profile/schemas';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    try {
      await connectToDatabase();
    } catch (err) {
      console.error('Database connection error:', err?.message || err);
      return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
    }
    const { user } = await getUserFromRequest(req);
    const body = await req.json();
    const parsed = EmailChangeStartSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ message: 'Validation error', errors: parsed.error.flatten() }), { status: 400 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    user.pendingEmail = parsed.data.newEmail;
    user.pendingEmailTokenHash = tokenHash;
    user.pendingEmailExpires = expires;
    await user.save();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/profile/email/confirm?uid=${user._id.toString()}&token=${token}`;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@riseup.local',
        to: parsed.data.newEmail,
        subject: 'Confirm your new email',
        text: `Click to confirm your new email: ${verifyUrl}`,
      });
      return new Response(JSON.stringify({ message: 'Verification email sent' }), { status: 200 });
    }

    // Fallback for dev without SMTP: return the verify URL (do not do this in prod)
    return new Response(JSON.stringify({ message: 'SMTP not configured. Use the link to confirm.', verifyUrl }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
