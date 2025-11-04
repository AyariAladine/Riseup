import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    // Get stripeCustomerId from Better Auth user collection
    if (!user.stripeCustomerId) return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/premium`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
