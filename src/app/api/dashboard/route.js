import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import RefreshToken from '@/models/RefreshToken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';

const ACCESS_SECRET = process.env.JWT_SECRET;

function parseCookies(header) {
  return Object.fromEntries((header || '').split(';').map(c => c.trim().split('=')));
}

// removed unused hashToken helper

export async function GET(req) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const access = cookies.access;
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err?.message || err);
    return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
  }

  try {
    if (access) {
      const decoded = jwt.verify(access, ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
      return new Response(
        JSON.stringify({ user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar || '' } }),
        { status: 200 }
      );
    }

    // no access token, try refresh
    const refresh = cookies.refresh;
    if (!refresh) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });

    // parse jti.secret
    const parts = refresh.split('.');
    if (parts.length !== 2) return new Response(JSON.stringify({ message: 'Invalid refresh token' }), { status: 401 });
    const [jti, secret] = parts;

    const stored = await RefreshToken.findOne({ jti, revoked: false, expiresAt: { $gt: new Date() } });
    if (!stored) return new Response(JSON.stringify({ message: 'Invalid refresh token' }), { status: 401 });

  const ok = await bcrypt.compare(secret, stored.secretHash);
    if (!ok) return new Response(JSON.stringify({ message: 'Invalid refresh token' }), { status: 401 });

    const user = await User.findById(stored.user);
    if (!user) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });

  // rotate refresh: revoke old and issue a new jti.secret
  stored.revoked = true;
  await stored.save();

  const newJti = crypto.randomBytes(16).toString('hex');
  const newSecret = crypto.randomBytes(32).toString('hex');
  const newSecretHash = await bcrypt.hash(newSecret, 10);
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await RefreshToken.create({ user: user._id, jti: newJti, secretHash: newSecretHash, expiresAt });

  const accessToken = jwt.sign({ id: user._id, email: user.email }, ACCESS_SECRET, { expiresIn: '7d' }); // 7 days
  const cookiesOut = [];
  cookiesOut.push(serialize('access', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 })); // 7 days
  cookiesOut.push(serialize('refresh', `${newJti}.${newSecret}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 90 * 24 * 60 * 60 })); // 90 days

    return new Response(
      JSON.stringify({ user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar || '' } }),
      { status: 200, headers: { 'Set-Cookie': cookiesOut.join(',') } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
}
