import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalHeader from '@/components/ConditionalHeader';
import ConditionalFooter from '@/components/ConditionalFooter';
import ClientProviders from '@/components/ClientProviders';
import SWRProvider from '@/components/SWRProvider';
import FirebasePushSubscriber from '@/components/FirebasePushSubscriber';
import ParticleBackground from '@/components/ParticleBackground';
import PageTransition from '@/components/PageTransition';

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
      { url: "/144.png", sizes: "144x144", type: "image/png" },
      { url: "/192.png", sizes: "192x192", type: "image/png" },
      { url: "/512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/144.png",
    apple: [
      { url: "/144.png", sizes: "144x144", type: "image/png" },
      { url: "/192.png", sizes: "192x192", type: "image/png" },
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
        <link rel="icon" type="image/png" sizes="144x144" href="/144.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/512.png" />
        <meta name="theme-color" content="#0b0d0f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RiseUP" />
        <link rel="apple-touch-icon" href="/192.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/144.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ParticleBackground />
        <SWRProvider>
          <ClientProviders />
          <FirebasePushSubscriber />
          <ConditionalHeader />
          <main className="container" style={{ maxWidth: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
            <PageTransition>
              <div style={{ width: '100%' }}>{children}</div>
            </PageTransition>
          </main>
          <ConditionalFooter />
        </SWRProvider>
      </body>
    </html>
  );
}
