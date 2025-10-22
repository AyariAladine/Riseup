import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import RefreshToken from '@/models/RefreshToken';
import { serialize } from 'cookie';
import { rateLimit } from '@/lib/rateLimiter';

import { sendPushToUser } from '@/lib/push';
import { sendMail } from '@/lib/sendMail';

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_EXPIRES_DAYS = 90; // 90 days - stay logged in for 3 months

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rl = rateLimit(`auth:login:${ip}`, 30, 60 * 1000);
  if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });
  const { email, password } = await req.json();
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err?.message || err);
    return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
  }

  const user = await User.findOne({ email });
  if (!user) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });

  // Longer access token - 7 days
  const accessToken = jwt.sign({ id: user._id, email: user.email }, ACCESS_SECRET, { expiresIn: '7d' });

  // Create refresh token (random) and store hashed in DB
  // create jti and secret, store secretHash in DB
  const jti = crypto.randomBytes(16).toString('hex');
  const secret = crypto.randomBytes(32).toString('hex');
  const refreshToken = `${jti}.${secret}`;
  const secretHash = await bcrypt.hash(secret, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ user: user._id, jti, secretHash, expiresAt });

  // Set cookies: access (7 days) and refresh (90 days)
  const cookies = [];
  cookies.push(serialize('access', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  }));
  cookies.push(serialize('refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_EXPIRES_DAYS * 24 * 60 * 60,
  }));

  const res = new Response(JSON.stringify({ user: { id: user._id, email: user.email, name: user.name } }), {
    status: 200,
    headers: { 'Set-Cookie': cookies.join(',') },
  });
  // Best-effort welcome back push
  try {
    await sendPushToUser(user._id, {
      title: 'Welcome back 👋',
      body: `${user.name || 'Friend'}, great to see you again!`,
      icon: '/globe.svg',
      url: '/dashboard/home',
    });
  } catch {}

  // Best-effort welcome back email
  try {
    await sendMail({
      to: user.email,
      subject: 'Welcome back to RiseUP!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome back, ${user.name || 'Friend'}! 👋</h2>
          <p>We're glad to see you again at <strong>RiseUP</strong>. Dive back in and continue your learning journey!</p>
          <p style="margin-top: 32px; color: #888; font-size: 13px;">If you did not log in, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error('Login email error:', e?.message || e);
  }

  return res;
}
