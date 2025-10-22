import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

import { sendPushToUser } from '@/lib/push';
import { sendMail } from '@/lib/sendMail';

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

  // Fire a welcome email (best-effort)
  try {
    await sendMail({
      to: newUser.email,
      subject: 'Welcome to RiseUP! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Congratulations, ${newUser.name || 'there'}! 🎉</h2>
          <p>Welcome to <strong>RiseUP</strong>. Your account is ready and you can start exploring all our features.</p>
          <p style="margin-top: 32px; color: #888; font-size: 13px;">If you did not sign up, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error('Signup email error:', e?.message || e);
  }

  return new Response(JSON.stringify({ message: 'User created', user: { id: newUser._id, email: newUser.email, name: newUser.name } }), { status: 201 });
}
