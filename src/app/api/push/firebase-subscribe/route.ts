import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Subscription from '@/models/Subscription';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Use upsert to avoid duplicate key errors
    const result = await Subscription.findOneAndUpdate(
      { fcmToken: token },
      {
        $set: {
          user: userId,
          fcmToken: token,
          type: 'firebase',
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription saved successfully',
      subscription: result
    });
  } catch (error) {
    console.error('Error saving Firebase subscription:', error);
    const details =
      error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
    return NextResponse.json(
      { error: 'Failed to save subscription', details },
      { status: 500 }
    );
  }
}

// Delete/unsubscribe
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await Subscription.deleteOne({ fcmToken: token });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting Firebase subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
