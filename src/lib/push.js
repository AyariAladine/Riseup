import webpush from 'web-push';
import Subscription from '@/models/Subscription';
import { connectToDatabase } from '@/lib/mongodb';

function configure() {
  const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const CONTACT = process.env.VAPID_CONTACT || 'mailto:admin@example.com';
  if (!PUBLIC || !PRIVATE) return false;
  try { webpush.setVapidDetails(CONTACT, PUBLIC, PRIVATE); return true; } catch { return false; }
}

export async function sendPushToUser(userId, payload) {
  if (!configure()) return { ok: false, reason: 'VAPID_MISSING' };
  await connectToDatabase();
  const subs = await Subscription.find({ user: userId }).lean();
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, body)));
  const failed = results.filter(r => r.status === 'rejected').length;
  return { ok: true, sent: subs.length - failed, failed };
}

export async function broadcastPush(payload) {
  if (!configure()) return { ok: false, reason: 'VAPID_MISSING' };
  await connectToDatabase();
  const subs = await Subscription.find({}).lean();
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, body)));
  const failed = results.filter(r => r.status === 'rejected').length;
  return { ok: true, sent: subs.length - failed, failed };
}
