import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

const SECRET = process.env.JWT_SECRET;

import { rateLimit } from '@/lib/rateLimiter';

export async function POST(req) {
  const { email } = await req.json();
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err?.message || err);
    return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
  }

  // basic rate limiting per email
  const rl = rateLimit(`forgot:${email}`, 5, 60 * 1000);
  if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });

  const user = await User.findOne({ email });
  if (!user) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: '1h' });

  // send email via Gmail SMTP
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return new Response(JSON.stringify({ message: 'Mail service not configured' }), { status: 500 });
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: user.email,
    subject: 'Password reset',
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Password reset</h2>
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.</p>
        <p style="text-align:center;"><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };
  
  try {
    await transporter.sendMail(mailOptions);
    return new Response(JSON.stringify({ message: 'Password reset link sent' }), { status: 200 });
  } catch (err) {
    console.error('Mail error', err);
    return new Response(JSON.stringify({ message: 'Error sending email' }), { status: 500 });
  }
}
