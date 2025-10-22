"use client";


import dynamic from 'next/dynamic';
import { SessionProvider } from 'next-auth/react';

// Lazy-load client-only providers to reduce main-thread work on first paint
const PWARegister = dynamic(() => import('./PWARegister'), { ssr: false });
const PushSubscriberClient = dynamic(() => import('./PushSubscriberClient'), { ssr: false });
const UserProvider = dynamic(() => import('./UserProvider'), { ssr: false });
const NotificationProvider = dynamic(() => import('./NotificationProvider'), { ssr: false });

export default function ClientProviders() {
  return (
    <SessionProvider>
      <PWARegister />
      <UserProvider />
      <NotificationProvider />
      <PushSubscriberClient />
    </SessionProvider>
  );
}
