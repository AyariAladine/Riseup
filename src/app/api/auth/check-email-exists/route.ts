import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    
    try {
      await connectToDatabase();
    } catch (err) {
      console.error('Database connection error:', err);
      return NextResponse.json(
        { message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' },
        { status: 500 }
      );
    }
    
    const user = await User.findOne({ email });
    return NextResponse.json({ exists: !!user }, { status: 200 });
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { message: 'Error checking email' },
      { status: 500 }
    );
  }
}
