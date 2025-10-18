import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: String,
    auth: String,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const Sub = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

export const dynamic = 'force-dynamic';

// Ensure VAPID keys in env
function configureWebPush() {
  const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const CONTACT = process.env.VAPID_CONTACT || 'mailto:admin@example.com';
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(CONTACT, PUBLIC, PRIVATE);
  return true;
}

export async function POST(req) {
  try {
    const ok = configureWebPush();
    if (!ok) return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    await connectToDatabase();
    const body = await req.json();
    const { subscription, userId } = body || {};
    if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    await Sub.updateOne({ endpoint: subscription.endpoint }, { $set: { ...subscription, user: userId || null } }, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
