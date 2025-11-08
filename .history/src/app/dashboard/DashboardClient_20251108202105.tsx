"use client";

import { useEffect, useState } from 'react';
import { setUser as setGlobalUser } from '@/lib/user-client';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SurveyModal from '@/components/SurveyModal';

interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  xp?: number;
  level?: number;
}

export default function DashboardClient({ initialUser }: { initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(null); // Start with null to force fresh fetch
  const [loading, setLoading] = useState<boolean>(true); // Always start loading
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Always fetch fresh user data on mount to avoid showing cached data
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/dashboard', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!res.ok) throw new Error('Unauthorized');

        const data = await res.json();
        setUser(data.user);
        setGlobalUser(data.user || null);

        // Check onboarding status and auto-show survey if not completed
        try {
          const onboardingRes = await fetch('/api/onboarding');
          if (onboardingRes.ok) {
            const onboardingJson = await onboardingRes.json();
            setOnboardingData(onboardingJson);
            // Auto-show survey modal if not completed and not previously skipped
            if (!onboardingJson.hasCompletedOnboarding && 
                !localStorage.getItem('survey-shown') && 
                !localStorage.getItem('survey-skipped')) {
              setShowOnboarding(true);
              localStorage.setItem('survey-shown', 'true');
            }
          }
        } catch (err) {
          console.error('Failed to check onboarding status:', err);
        }
      } catch {
        // Clear session using better-auth and redirect
        await signOut();
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Log when the onboarding modal is toggled (avoid inline console.debug in JSX)
  useEffect(() => {
    console.debug('[Dashboard] showOnboarding state changed:', showOnboarding);
  }, [showOnboarding]);

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
        <div style={{ marginLeft: 'auto' }}>
            <div onClick={() => { 
              console.debug('[Dashboard] Take Survey clicked'); 
              localStorage.removeItem('survey-skipped'); // Allow retaking if previously skipped
              setShowOnboarding(true); 
            }} className="github-card github-card-interactive" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#FFE6D1,#FFD8C0)' }}>
          {onboardingData && !onboardingData.hasCompletedOnboarding && (
            <div onClick={() => { console.debug('[Dashboard] Take Survey clicked'); setShowOnboarding(true); }} className="github-card github-card-interactive" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#FFE6D1,#FFD8C0)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#D2691E"/></svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 800, color: '#8B4513' }}>Take Survey</div>
                <div style={{ fontSize: 12, color: '#A0522D' }}>Personalize your learning</div>
              </div>
            </div>
          )}
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

  <Link href="/dashboard/tasks" className="github-card github-card-interactive">
          <div className="github-card-icon" style={{ background: 'linear-gradient(135deg, #60A5FA, #3B82F6)' }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'white' }}>
              <path d="M1.5 3.25a2.25 2.25 0 113.5 2.5c0-.66-.27-1.26-.7-1.69a.75.75 0 00-1.05 1.06c.2.2.3.47.3.63a.75.75 0 01-1.5 0 1.75 1.75 0 111.75-1.75v-.25a.75.75 0 00-1.5 0v1.75c0 .138.112.25.25.25h3.5a.75.75 0 000-1.5h-3.5A1.75 1.75 0 011.5 3.25zM0 4.87C0 3.84 1.03 3 2.25 3h.5a.75.75 0 010 1.5h-.5A.75.75 0 002.25 6H3.5v1.75a.75.75 0 01-1.5 0v-1.75H1.5v3.75a.75.75 0 01-1.5 0V4.87z"/>
              <path d="M12.25 1H11.5a.75.75 0 000 1.5h.75c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25v-9.5C2 2.784 2.784 2 3.75 2h.75a.75.75 0 000-1.5h-.75A3.25 3.25 0 001 3.75v9.5A3.25 3.25 0 004.25 16h8.5A3.25 3.25 0 0016 12.75v-9.5A3.25 3.25 0 0012.25 0h-.75a.75.75 0 000 1.5h.75z"/>
            </svg>
          </div>
          <div className="github-card-content">
            <div className="github-card-title">Tasks</div>
            <div className="github-card-description">Manage your tasks with Kanban board and AI summaries</div>
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

      {/* Onboarding Modal - Auto-show for new users */}
      {showOnboarding && (
          <SurveyModal
            onComplete={(profile) => {
              console.debug('[Dashboard] SurveyModal onComplete', profile);
              setShowOnboarding(false);
              localStorage.removeItem('survey-shown'); // Clear flag so it doesn't show again
              setOnboardingData({ hasCompletedOnboarding: true, profile });
              // Optionally refresh the page or show a success message
              window.location.reload(); // Refresh to update the UI
            }}
            onSkip={() => { 
              console.debug('[Dashboard] SurveyModal onSkip'); 
              setShowOnboarding(false);
              localStorage.setItem('survey-skipped', 'true'); // Mark as skipped
            }}
          />
      )}
    </div>
  );
}
