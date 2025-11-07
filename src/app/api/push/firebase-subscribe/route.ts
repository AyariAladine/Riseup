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

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({ 
      fcmToken: token 
    });

    if (existingSubscription) {
      // Update userId if provided
      if (userId && existingSubscription.user !== userId) {
        existingSubscription.user = userId;
        existingSubscription.updatedAt = new Date();
        await existingSubscription.save();
      }
      return NextResponse.json({ 
        success: true, 
        message: 'Subscription already exists' 
      });
    }

    // Create new subscription
    const newSubscription = new Subscription({
      user: userId,
      fcmToken: token,
      type: 'firebase',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newSubscription.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription saved successfully' 
    });
  } catch (error) {
    console.error('Error saving Firebase subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
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
