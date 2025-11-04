import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Register user's face with the Face Recognition API
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // Forward request to Face Recognition API
    const faceApiUrl = process.env.FACE_API_URL || 'http://localhost:8000';
    const faceFormData = new FormData();
    faceFormData.append('user_id', user.email); // Changed from worker_id to user_id
    faceFormData.append('file', imageFile);

    const faceApiResponse = await fetch(`${faceApiUrl}/register/`, {
      method: 'POST',
      body: faceFormData,
    });

    if (!faceApiResponse.ok) {
      const error = await faceApiResponse.json();
      return NextResponse.json(
        { error: error.detail || 'Face registration failed' },
        { status: faceApiResponse.status }
      );
    }

    const faceData = await faceApiResponse.json();

    // Update user in Better Auth database to mark face as registered
    const db = await connectToDatabase();
    const userCollection = db.collection('user');
    
    await userCollection.updateOne(
      { email: user.email },
      {
        $set: {
          faceRegistered: true,
          faceRegisteredAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Face registered successfully',
      data: faceData,
    });
  } catch (error: any) {
    console.error('Face registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get user's face registration status
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await connectToDatabase();
    const userCollection = db.collection('user');
    
    const dbUser = await userCollection.findOne({ email: user.email });

    return NextResponse.json({
      faceRegistered: dbUser?.faceRegistered || false,
      faceRegisteredAt: dbUser?.faceRegisteredAt || null,
    });
  } catch (error: any) {
    console.error('Face status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Delete user's face registration
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete from Face Recognition API
    const faceApiUrl = process.env.FACE_API_URL || 'http://localhost:8000';
    const faceApiResponse = await fetch(`${faceApiUrl}/workers/${user.email}`, {
      method: 'DELETE',
    });

    if (!faceApiResponse.ok && faceApiResponse.status !== 404) {
      const error = await faceApiResponse.json();
      return NextResponse.json(
        { error: error.detail || 'Failed to delete face registration' },
        { status: faceApiResponse.status }
      );
    }

    // Update user in Better Auth database
    const db = await connectToDatabase();
    const userCollection = db.collection('user');
    
    await userCollection.updateOne(
      { email: user.email },
      {
        $set: {
          faceRegistered: false,
          updatedAt: new Date(),
        },
        $unset: {
          faceRegisteredAt: '',
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Face registration deleted successfully',
    });
  } catch (error: any) {
    console.error('Face deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
