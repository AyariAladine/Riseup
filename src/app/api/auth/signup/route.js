import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { sendPushToUser } from '@/lib/push';

export async function POST(req) {
  const { name, email, password } = await req.json();
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err?.message || err);
    return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) return new Response(JSON.stringify({ message: 'User already exists' }), { status: 400 });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({ name, email, password: hashedPassword });

  // Fire a welcome push (best-effort; does not affect response)
  try {
    await sendPushToUser(newUser._id, {
      title: 'Welcome to RiseUP 🎉',
      body: `Hi ${newUser.name || 'there'}! Your account is ready.`,
      icon: '/globe.svg',
      url: '/dashboard/home',
    });
  } catch {}

  return new Response(JSON.stringify({ message: 'User created', user: { id: newUser._id, email: newUser.email, name: newUser.name } }), { status: 201 });
}
