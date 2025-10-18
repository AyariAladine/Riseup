"use client";
import { useEffect, useState } from 'react';
import { useUser } from '@/lib/user-client';

// Convert base64 public key to Uint8 array for subscription
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushSubscriber() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    (async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.ready;
        // Request permission if not already granted/denied
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') return;

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
        if (!publicKey) return;

        const existing = await reg.pushManager.getSubscription();
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const u = user as unknown as Record<string, unknown> | null;
        const userId = u?.id || u?._id || null;
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, userId }),
        });
        setReady(true);
      } catch (e: unknown) {
        setError((e as Error)?.message || 'Failed to enable notifications');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="small muted">Notifications error: {error}</div>;
  if (!ready) return null;
  return null;
}
