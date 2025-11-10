import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import { notifyPremiumActivated } from '@/lib/notification-helper';


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
    const db = await connectToDatabase();
    const userCollection = db.collection('user'); // Better Auth uses 'user' (singular)
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        if (customerId) {
          const updatedUser = await userCollection.findOneAndUpdate(
            { stripeCustomerId: customerId },
            { $set: { isPremium: true, updatedAt: new Date() } },
            { returnDocument: 'after' }
          );
          console.log(`✅ Premium activated via webhook for customer ${customerId}`);
          
          // Send push notification
          if (updatedUser?.id) {
            await notifyPremiumActivated(updatedUser.id).catch(err =>
              console.error('Failed to send premium notification:', err)
            );
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const active = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
        const updatedUser = await userCollection.findOneAndUpdate(
          { stripeCustomerId: customerId },
          { $set: { isPremium: !!active, updatedAt: new Date() } },
          { returnDocument: 'after' }
        );
        console.log(`✅ Subscription ${sub.id} for customer ${customerId}: isPremium=${active}`);
        
        // Send push notification only when becoming premium
        if (active && updatedUser?.id) {
          await notifyPremiumActivated(updatedUser.id).catch(err =>
            console.error('Failed to send premium notification:', err)
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        await userCollection.updateOne(
          { stripeCustomerId: customerId },
          { $set: { isPremium: false, updatedAt: new Date() } }
        );
        console.log(`⚠️ Subscription cancelled for customer ${customerId}`);
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
