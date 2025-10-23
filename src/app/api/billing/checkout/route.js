import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';


export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

    const secret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID; // recurring price for subscription
    if (!secret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
    
    // If no price ID is configured, create a checkout session with dynamic price
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price not configured. Please set STRIPE_PRICE_ID in your environment variables.' }, { status: 500 });
    }

    // Ensure customer exists
    // Use the extended user object from Better Auth
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id?.toString?.() || user.id },
      });
      stripeCustomerId = customer.id;
      // Update the user in MongoDB directly
      const usersCollection = (await connectToDatabase()).collection('users');
      await usersCollection.updateOne(
        { email: user.email },
        { $set: { stripeCustomerId } }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/dashboard/premium?success=1`,
      cancel_url: `${baseUrl}/dashboard/premium?canceled=1`,
      metadata: { userId: user._id?.toString?.() || user.id },
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
