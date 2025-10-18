"use client";

import { useEffect, useState } from 'react';
import { setUser as setGlobalUser } from '@/lib/user-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  xp?: number;
  level?: number;
}

export default function DashboardClient({ initialUser }: { initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState<boolean>(!initialUser);
  const router = useRouter();

  useEffect(() => {
    // If we didn't receive a user from the server, fetch on client as a fallback
    if (!initialUser) {
      const fetchUser = async () => {
        try {
          const res = await fetch('/api/dashboard');
          if (!res.ok) throw new Error('Unauthorized');

          const data = await res.json();
          setUser(data.user);
          try {
            sessionStorage.setItem('prefetch:user', JSON.stringify(data.user || null));
            window.dispatchEvent(new CustomEvent('user-prefetched', { detail: data.user || null }));
          } catch {}
          setGlobalUser(data.user || null);
        } catch {
          // Clear cookie server-side via logout endpoint and redirect
          await fetch('/api/auth/logout', { method: 'POST' });
          router.push('/auth/login');
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    } else {
      // We have initial user; propagate to global client state immediately
      try {
        sessionStorage.setItem('prefetch:user', JSON.stringify(initialUser || null));
        window.dispatchEvent(new CustomEvent('user-prefetched', { detail: initialUser || null }));
      } catch {}
      setGlobalUser(initialUser || null);
      setLoading(false);
    }
  }, [initialUser, router]);

  if (loading) {
    return (
      <div className="github-loading">
        <div className="github-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="github-container">
      <div className="github-page-header">
        <div>
          <h1 className="github-page-title">Welcome{user?.name ? `, ${user.name}` : ''}! 👋</h1>
          <p className="github-page-description">Choose where you'd like to start</p>
        </div>
      </div>

      <div className="github-dashboard-grid">
  <Link href="/dashboard/home" className="github-card github-card-interactive">
          <div className="github-card-icon github-card-icon-home">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.906.664a1.749 1.749 0 012.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0113.25 15h-3.5a.75.75 0 01-.75-.75V9H7v5.25a.75.75 0 01-.75.75h-3.5A1.75 1.75 0 011 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2z"/>
            </svg>
          </div>
          <div className="github-card-content">
            <div className="github-card-title">Home</div>
            <div className="github-card-description">Your personalized dashboard with quick access to everything</div>
          </div>
          <div className="github-card-arrow">→</div>
  </Link>

  <Link href="/dashboard/calendar" className="github-card github-card-interactive">
          <div className="github-card-icon github-card-icon-calendar">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.75 0a.75.75 0 01.75.75V2h5V.75a.75.75 0 011.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 014.75 0zm0 3.5h8.5a.25.25 0 01.25.25V6h-11V3.75a.25.25 0 01.25-.25h2.5z"/>
            </svg>
          </div>
          <div className="github-card-content">
            <div className="github-card-title">Calendar</div>
            <div className="github-card-description">Plan your day and track upcoming tasks</div>
          </div>
          <div className="github-card-arrow">→</div>
  </Link>

  <Link href="/learn" className="github-card github-card-interactive">
          <div className="github-card-icon github-card-icon-learn">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0114.25 13H8.06l-2.573 2.573A1.458 1.458 0 013 14.543V13H1.75A1.75 1.75 0 010 11.25v-9.5zM1.75 1.5a.25.25 0 00-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h6.5a.25.25 0 00.25-.25v-9.5a.25.25 0 00-.25-.25H1.75z"/>
            </svg>
          </div>
          <div className="github-card-content">
            <div className="github-card-title">Learn</div>
            <div className="github-card-description">Interactive lessons and AI-powered learning</div>
          </div>
          <div className="github-card-arrow">→</div>
  </Link>

  <Link href="/dashboard/assistant" className="github-card github-card-interactive">
          <div className="github-card-icon github-card-icon-assistant">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13h3.5l2.83 2.83a.75.75 0 001.14-.19l.66-1.31.66 1.31a.75.75 0 001.14.19L14.25 13h.5A1.25 1.25 0 0016 11.75v-9A1.25 1.25 0 0014.75 1.5h-13zm0 10.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v8.5a.25.25 0 01-.25.25h-3.5a.75.75 0 00-.531.22L8 13.72l-2.22-2.22a.75.75 0 00-.53-.22h-3.5z"/>
              <path d="M5 5.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 5.25zM5 8.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5A.75.75 0 015 8.25z"/>
            </svg>
          </div>
          <div className="github-card-content">
            <div className="github-card-title">Assistant</div>
            <div className="github-card-description">Get help with homework and instant grading</div>
          </div>
          <div className="github-card-arrow">→</div>
  </Link>

  <Link href="/dashboard/profile" className="github-card github-card-interactive">
          <div className="github-card-icon github-card-icon-profile">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.561 8.073a6.005 6.005 0 003.432-5.142.75.75 0 10-1.498.07 4.5 4.5 0 01-8.99 0 .75.75 0 00-1.498-.07 6.004 6.004 0 003.431 5.142 3.999 3.999 0 00-1.989 3.178.75.75 0 101.493.154 2.5 2.5 0 014.992 0 .75.75 0 101.493-.154 4 4 0 00-1.989-3.178z"/>
            </svg>
          </div>
          <div className="github-card-content">
            <div className="github-card-title">Profile</div>
            <div className="github-card-description">Manage your account and settings</div>
          </div>
          <div className="github-card-arrow">→</div>
  </Link>
      </div>
    </div>
  );
}
