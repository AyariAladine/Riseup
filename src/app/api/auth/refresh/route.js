import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { serialize } from 'cookie';
import { connectToDatabase } from '@/lib/mongodb';
import RefreshToken from '@/models/RefreshToken';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rateLimiter';
import User from '@/models/User';

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_EXPIRES_DAYS = 90; // 90 days - stay logged in for 3 months

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rl = rateLimit(`auth:refresh:${ip}`, 60, 60 * 1000);
  if (!rl.ok) return new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 });
  const cookies = req.headers.get('cookie') || '';
  const parsed = Object.fromEntries(cookies.split(';').map(c => c.trim().split('=')));
  const refresh = parsed.refresh;
  if (!refresh) return new Response(JSON.stringify({ message: 'No refresh token' }), { status: 401 });

  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err?.message || err);
    return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
  }
    // parse jti.secret
    const parts = refresh.split('.');
    if (parts.length !== 2) return new Response(JSON.stringify({ message: 'Invalid refresh format' }), { status: 401 });
    const [jti, secret] = parts;

    const stored = await RefreshToken.findOne({ jti, revoked: false });
    if (!stored || stored.expiresAt < new Date()) return new Response(JSON.stringify({ message: 'Invalid refresh token' }), { status: 401 });

    const match = await bcrypt.compare(secret, stored.secretHash);
    if (!match) return new Response(JSON.stringify({ message: 'Invalid refresh token' }), { status: 401 });

  const user = await User.findById(stored.user);
  if (!user) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });

  // rotate refresh token: revoke old, create new jti and secret
  stored.revoked = true;
  await stored.save();

  const newJti = crypto.randomBytes(16).toString('hex');
  const newSecret = crypto.randomBytes(32).toString('hex');
  const newSecretHash = await bcrypt.hash(newSecret, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: user._id, jti: newJti, secretHash: newSecretHash, expiresAt });

  const accessToken = jwt.sign({ id: user._id, email: user.email }, ACCESS_SECRET, { expiresIn: '7d' });

  const cookiesOut = [];
  cookiesOut.push(serialize('access', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 }));
  cookiesOut.push(serialize('refresh', `${newJti}.${newSecret}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: REFRESH_EXPIRES_DAYS * 24 * 60 * 60 }));

  return new Response(JSON.stringify({ user: { id: user._id, email: user.email, name: user.name } }), { status: 200, headers: { 'Set-Cookie': cookiesOut.join(',') } });
}
