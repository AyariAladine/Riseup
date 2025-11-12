"use client";

import { useEffect, useState } from 'react';
import { setUser as setGlobalUser } from '@/lib/user-client';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SurveyModal from '@/components/SurveyModal';
import useSWR from 'swr';
import { Loader2, Medal, Users, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  xp?: number;
  level?: number;
}

interface LeaderboardEntry {
  _id: string;
  rank: number;
  totalBadges: number;
  totalScore: number;
  avgScore: number;
  languages: string[];
  diamondBadges: number;
  goldBadges: number;
  silverBadges: number;
  bronzeBadges: number;
  userName: string;
  userAvatar?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardClient({ initialUser }: { initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(null); // Start with null to force fresh fetch
  const [loading, setLoading] = useState<boolean>(true); // Always start loading
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const router = useRouter();

  // Leaderboard state
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  // Weekly Activity state
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: weeklyActivity, isLoading: activityLoading } = useSWR(
    `/api/activity/weekly?weekOffset=${weekOffset}`,
    fetcher
  );

  // Fetch leaderboard data with language filter
  const { data: leaderboardData, isLoading: leaderboardLoading } = useSWR<{ leaderboard: LeaderboardEntry[] }>(
    selectedLanguage
      ? `/api/achievements/leaderboard?language=${selectedLanguage}&limit=100`
      : `/api/achievements/leaderboard?limit=100`,
    fetcher
  );

  const leaderboard = leaderboardData?.leaderboard || [];
  const languages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Rust'];

  // Helper function to check onboarding status
  const checkOnboarding = async (userId: string) => {
    try {
      const onboardingRes = await fetch('/api/onboarding');
      if (onboardingRes.ok) {
        const onboardingJson = await onboardingRes.json();
        setOnboardingData(onboardingJson);
        // Do NOT auto-show the onboarding modal; user will opt-in
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
    }
  };

  // Track dashboard visit as activity
  useEffect(() => {
    if (user?.id) {
      // Fire and forget - track dashboard visit
      fetch('/api/activity/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }).catch(() => {}); // Ignore errors
    }
  }, [user?.id]);

  useEffect(() => {
    // Use initialUser if available to avoid redundant fetch
    if (initialUser) {
      setUser(initialUser);
      setGlobalUser(initialUser);
      setLoading(false);
      
      // Check onboarding after user is set
      checkOnboarding(initialUser.id);
      return;
    }

    // Only fetch if no initialUser provided
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/dashboard', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Unauthorized');

        const data = await res.json();
        setUser(data.user);
        setGlobalUser(data.user || null);
        
        if (data.user?.id) {
          checkOnboarding(data.user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Clear session using better-auth and redirect
        await signOut();
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [initialUser, router]);

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
          {/* Show 'Take Survey' card-style button only when survey not completed */}
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

  <Link href="/dashboard/tasks" className="github-card github-card-interactive">
          <div className="github-card-icon github-card-icon-calendar">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 3.5v9c0 .28.22.5.5.5h10a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5H3a.5.5 0 00-.5.5zM3 2h10a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V4a2 2 0 012-2zm6.854 5.854l-3 3a.5.5 0 01-.708 0l-1.5-1.5a.5.5 0 01.708-.708L6.5 9.793l2.646-2.647a.5.5 0 01.708.708z"/>
            </svg>
          </div>
          <div className="github-card-content">
            <div className="github-card-title">Tasks</div>
            <div className="github-card-description">Manage your tasks with Kanban board and AI recommendations</div>
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

      {/* Full Leaderboard Section */}
      <div style={{ marginTop: '32px' }}>
        {/* Header with Language Filters */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Medal className="w-6 h-6" style={{ color: '#eab308' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Leaderboard</h2>
          </div>

          {/* Language Filter Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setSelectedLanguage(null)}
              className="github-btn"
              style={{
                padding: '8px 16px',
                background: selectedLanguage === null ? 'var(--accent)' : 'var(--card)',
                color: selectedLanguage === null ? 'white' : 'var(--fg)',
                border: selectedLanguage === null ? 'none' : '1px solid var(--border)',
                fontWeight: 500
              }}
            >
              All Languages
            </button>
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className="github-btn"
                style={{
                  padding: '8px 16px',
                  background: selectedLanguage === lang ? 'var(--accent)' : 'var(--card)',
                  color: selectedLanguage === lang ? 'white' : 'var(--fg)',
                  border: selectedLanguage === lang ? 'none' : '1px solid var(--border)',
                  fontWeight: 500
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Content */}
        {leaderboardLoading ? (
          <div className="github-card" style={{ padding: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="github-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
            <Users className="w-16 h-16" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '18px', fontWeight: 500 }}>No participants yet</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Be the first to earn achievements!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {leaderboard.map((entry) => {
              const getRankColor = (rank: number) => {
                if (rank === 1) return 'linear-gradient(135deg, #fbbf24, #f59e0b)';
                if (rank === 2) return 'linear-gradient(135deg, #d1d5db, #9ca3af)';
                if (rank === 3) return 'linear-gradient(135deg, #fb923c, #ea580c)';
                return 'linear-gradient(135deg, #6b7280, #374151)';
              };

              const getRankMedal = (rank: number) => {
                if (rank === 1) return '🥇';
                if (rank === 2) return '🥈';
                if (rank === 3) return '🥉';
                return `#${rank}`;
              };

              return (
                <div 
                  key={entry._id} 
                  className="github-card" 
                  style={{ 
                    padding: '20px',
                    transition: 'all 0.2s',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Rank Medal */}
                    <div style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '12px', 
                      background: getRankColor(entry.rank),
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }}>
                      {getRankMedal(entry.rank)}
                    </div>

                    {/* User Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 700, fontSize: '18px', margin: 0, color: 'var(--fg)' }}>
                          {entry.userName}
                        </p>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {entry.diamondBadges > 0 && (
                            <span title={`${entry.diamondBadges} Diamond badges`} style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              💎 <span style={{ fontSize: '14px', fontWeight: 600 }}>{entry.diamondBadges}</span>
                            </span>
                          )}
                          {entry.goldBadges > 0 && (
                            <span title={`${entry.goldBadges} Gold badges`} style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              🥇 <span style={{ fontSize: '14px', fontWeight: 600 }}>{entry.goldBadges}</span>
                            </span>
                          )}
                          {entry.silverBadges > 0 && (
                            <span title={`${entry.silverBadges} Silver badges`} style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              🥈 <span style={{ fontSize: '14px', fontWeight: 600 }}>{entry.silverBadges}</span>
                            </span>
                          )}
                          {entry.bronzeBadges > 0 && (
                            <span title={`${entry.bronzeBadges} Bronze badges`} style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              � <span style={{ fontSize: '14px', fontWeight: 600 }}>{entry.bronzeBadges}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>{entry.languages.join(', ')}</span>
                        <span>•</span>
                        <span>Avg Score: <strong>{entry.avgScore.toFixed(1)}%</strong></span>
                        <span>•</span>
                        <span>Total Score: <strong>{entry.totalScore}</strong></span>
                      </div>
                    </div>

                    {/* Total Badges Count */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                        {entry.totalBadges}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, marginTop: '4px' }}>
                        {entry.totalBadges === 1 ? 'Badge' : 'Badges'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Activity Graph */}
      <div style={{ marginTop: '32px' }}>
        <div className="github-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Weekly Activity</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="github-btn"
                style={{ padding: '6px 12px', fontSize: '14px' }}
                title="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '14px', color: 'var(--muted)', minWidth: '120px', textAlign: 'center' }}>
                {weeklyActivity?.weekStart && weeklyActivity?.weekEnd ? (
                  <>
                    {new Date(weeklyActivity.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weeklyActivity.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </>
                ) : 'Loading...'}
              </span>
              <button
                onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                disabled={weekOffset === 0}
                className="github-btn"
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '14px',
                  opacity: weekOffset === 0 ? 0.5 : 1,
                  cursor: weekOffset === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Next week"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {activityLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : weeklyActivity?.days ? (
            <>
              {/* Activity Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: '8px',
                marginBottom: '16px'
              }}>
                {weeklyActivity.days.map((day: any, index: number) => {
                  const getIntensity = () => {
                    if (!day.isActive) return 0;
                    // You can enhance this later to show different intensities
                    return 4; // Max intensity for now
                  };

                  const intensity = getIntensity();
                  const colors = [
                    'var(--panel-2)', // No activity
                    '#0e4429', // Level 1
                    '#006d32', // Level 2
                    '#26a641', // Level 3
                    '#39d353'  // Level 4 (max)
                  ];

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: colors[intensity],
                          border: day.isToday ? '2px solid var(--accent)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        title={`${day.dayName}, ${day.date} - ${day.isActive ? 'Active' : 'No activity'}`}
                        onMouseEnter={(e) => {
                          if (day.isActive) {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(57, 211, 83, 0.5)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: day.isToday ? 600 : 400 }}>
                        {day.dayName}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {day.dayNumber}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend and Summary */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
                fontSize: '12px',
                color: 'var(--muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>Less</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '3px',
                          background: ['#0e4429', '#006d32', '#26a641', '#39d353'][level - 1]
                        }}
                      />
                    ))}
                  </div>
                  <span>More</span>
                </div>
                <div style={{ fontWeight: 500, color: 'var(--fg)' }}>
                  {weeklyActivity.totalActiveDays} of 7 days active this week
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              <p style={{ fontSize: '14px' }}>No activity data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal - Optional */}
      {showOnboarding && (
        <div>
          <SurveyModal
            onComplete={(profile) => {
              console.debug('[Dashboard] SurveyModal onComplete', profile);
              setShowOnboarding(false);
              setOnboardingData({ hasCompletedOnboarding: true, profile });
            }}
            onSkip={() => { console.debug('[Dashboard] SurveyModal onSkip'); setShowOnboarding(false); }}
          />
        </div>
      )}
    </div>
  );
}
