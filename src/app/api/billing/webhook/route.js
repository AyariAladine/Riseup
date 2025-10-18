import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }
  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    await connectToDatabase();
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        if (customerId) {
          const user = await User.findOne({ stripeCustomerId: customerId });
          if (user) { user.isPremium = true; await user.save(); }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const active = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) { user.isPremium = !!active; await user.save(); }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) { user.isPremium = false; await user.save(); }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
