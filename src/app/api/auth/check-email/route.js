import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
  const { email } = await req.json();
  if (!email) return new Response(JSON.stringify({ exists: false }), { status: 200 });
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err?.message || err);
    return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
  }
  const user = await User.findOne({ email });
  return new Response(JSON.stringify({ exists: !!user }), { status: 200 });
}
