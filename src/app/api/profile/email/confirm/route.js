import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req) {
  try {
    try {
      await connectToDatabase();
    } catch (err) {
      console.error('Database connection error:', err?.message || err);
      return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    if (!uid || !token) return new Response(JSON.stringify({ message: 'Missing parameters' }), { status: 400 });

    const user = await User.findById(uid);
    if (!user) return new Response(JSON.stringify({ message: 'Invalid user' }), { status: 400 });
    if (!user.pendingEmail || !user.pendingEmailTokenHash || !user.pendingEmailExpires) {
      return new Response(JSON.stringify({ message: 'No pending email change' }), { status: 400 });
    }
    if (user.pendingEmailExpires.getTime() < Date.now()) {
      user.pendingEmail = undefined;
      user.pendingEmailTokenHash = undefined;
      user.pendingEmailExpires = undefined;
      await user.save();
      return new Response(JSON.stringify({ message: 'Token expired' }), { status: 400 });
    }

    const ok = await bcrypt.compare(token, user.pendingEmailTokenHash);
    if (!ok) return new Response(JSON.stringify({ message: 'Invalid token' }), { status: 400 });

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.pendingEmailTokenHash = undefined;
    user.pendingEmailExpires = undefined;
    await user.save();

    return new Response(JSON.stringify({ message: 'Email updated' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
