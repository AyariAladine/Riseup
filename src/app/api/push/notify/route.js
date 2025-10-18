import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: { p256dh: String, auth: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
const Sub = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

export const dynamic = 'force-dynamic';

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
    const { title = 'RiseUP', body = 'Notification', icon = '/globe.svg', url = '/', userId } = await req.json();
    const filter = userId ? { user: userId } : {};
    const subs = await Sub.find(filter).lean();
    const payload = JSON.stringify({ title, body, icon, url });
    const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload)));
    const failures = results.filter(r => r.status === 'rejected');
    return NextResponse.json({ ok: true, sent: subs.length - failures.length, failed: failures.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
