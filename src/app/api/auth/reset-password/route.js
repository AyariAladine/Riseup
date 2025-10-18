import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import RefreshToken from '@/models/RefreshToken';
import { sendPushToUser } from '@/lib/push';

const SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  const { token, password } = await req.json();
  if (!token || !password) return new Response(JSON.stringify({ message: 'Missing token or password' }), { status: 400 });

  try {
    const decoded = jwt.verify(token, SECRET);
    try {
      await connectToDatabase();
    } catch (err) {
      console.error('Database connection error:', err?.message || err);
      return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
    }

    const user = await User.findById(decoded.id);
    if (!user) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    await user.save();

    // revoke all refresh tokens for this user
    await RefreshToken.updateMany({ user: user._id }, { revoked: true });
    // Notify user
    try {
      await sendPushToUser(user._id, {
        title: 'Password updated ✅',
        body: 'Your password was changed successfully.',
        icon: '/globe.svg',
        url: '/auth/login',
      });
    } catch {}

    return new Response(JSON.stringify({ message: 'Password reset successful' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Invalid or expired token' }), { status: 401 });
  }
}
