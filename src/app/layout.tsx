import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalHeader from '@/components/ConditionalHeader';
import ConditionalFooter from '@/components/ConditionalFooter';
import PWARegister from '@/components/PWARegister';
import PushSubscriberClient from '@/components/PushSubscriberClient';
import UserProvider from '@/components/UserProvider';
import NotificationProvider from '@/components/NotificationProvider';
// Import a thin client-only wrapper for BottomBar. This keeps the server
// layout as a Server Component while allowing BottomBar to run on the client.
import BottomBarClient from '@/components/BottomBarClient';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RiseUP",
  description: "RiseUP – Learn and practice with an installable, offline-capable app.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/globe.svg",
    shortcut: "/vercel.svg",
    apple: "/globe.svg",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b0d0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0d0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
  <PWARegister />
  <UserProvider />
  <NotificationProvider />
    <ConditionalHeader />
  <PushSubscriberClient />
        <main className="container" style={{ maxWidth: '100%', width: '100%' }}>
          <div style={{ width: '100%' }}>{children}</div>
        </main>
        {/* Mobile bottom navigation (fixed). Visible under 720px width. */}
        <BottomBarClient />
  <ConditionalFooter />
      </body>
    </html>
  );
}
