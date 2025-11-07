import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalHeader from '@/components/ConditionalHeader';
import ConditionalFooter from '@/components/ConditionalFooter';
import ClientProviders from '@/components/ClientProviders';
import SWRProvider from '@/components/SWRProvider';
// Import a thin client-only wrapper for BottomBar. This keeps the server
// layout as a Server Component while allowing BottomBar to run on the client.
import BottomBarClient from '@/components/BottomBarClient';
import FirebasePushSubscriber from '@/components/FirebasePushSubscriber';

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
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-96x96.png",
    apple: [
      { url: "/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RiseUP",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow zooming for accessibility
  userScalable: true,
  maximumScale: 5,
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
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <meta name="theme-color" content="#0b0d0f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RiseUP" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SWRProvider>
          <ClientProviders />
          <FirebasePushSubscriber />
          <ConditionalHeader />
          <main className="container" style={{ maxWidth: '100%', width: '100%' }}>
            <div style={{ width: '100%' }}>{children}</div>
          </main>
          {/* Mobile bottom navigation (fixed). Visible under 720px width. */}
          <BottomBarClient />
          <ConditionalFooter />
        </SWRProvider>
      </body>
    </html>
  );
}
