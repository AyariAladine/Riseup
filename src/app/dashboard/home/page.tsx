"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main dashboard page
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="github-loading">
      <div className="github-spinner" />
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
