import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// Legacy route - email changes should use Better Auth methods
export async function GET(req) {
  try {
    let db;
    try {
      db = await connectToDatabase();
    } catch (err) {
      console.error('Database connection error:', err?.message || err);
      return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    if (!uid || !token) return new Response(JSON.stringify({ message: 'Missing parameters' }), { status: 400 });

    const userCollection = db.collection('user');
    const user = await userCollection.findOne({ _id: new ObjectId(uid) });
    if (!user) return new Response(JSON.stringify({ message: 'Invalid user' }), { status: 400 });
    if (!user.pendingEmail || !user.pendingEmailTokenHash || !user.pendingEmailExpires) {
      return new Response(JSON.stringify({ message: 'No pending email change' }), { status: 400 });
    }
    if (new Date(user.pendingEmailExpires).getTime() < Date.now()) {
      await userCollection.updateOne(
        { _id: new ObjectId(uid) },
        { 
          $unset: { 
            pendingEmail: '', 
            pendingEmailTokenHash: '', 
            pendingEmailExpires: '' 
          },
          $set: { updatedAt: new Date() }
        }
      );
      return new Response(JSON.stringify({ message: 'Token expired' }), { status: 400 });
    }

    const ok = await bcrypt.compare(token, user.pendingEmailTokenHash);
    if (!ok) return new Response(JSON.stringify({ message: 'Invalid token' }), { status: 400 });

    await userCollection.updateOne(
      { _id: new ObjectId(uid) },
      { 
        $set: { 
          email: user.pendingEmail, 
          updatedAt: new Date() 
        },
        $unset: { 
          pendingEmail: '', 
          pendingEmailTokenHash: '', 
          pendingEmailExpires: '' 
        }
      }
    );

    return new Response(JSON.stringify({ message: 'Email updated' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
