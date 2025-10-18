"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to splash screen on first load
    // Splash screen will handle auth check and redirect to dashboard or login
    router.replace('/splash');
  }, [router]);

  // Show nothing while redirecting
  return null;
}
