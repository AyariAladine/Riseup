"use client";
import { useEffect, useState } from 'react';

import { setUser as setUserGlobal } from '@/lib/user-client';
import { showNotification } from '@/components/NotificationProvider';
import { useProfile } from '@/lib/useProfile';

type Profile = { user: { name: string; email: string; isPremium?: boolean } };

export default function PremiumPage() {
  const { profile, mutate: mutateProfile, isLoading } = useProfile();
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if returning from successful checkout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
      (async () => {
        try {
          await fetch('/api/profile/upgrade', { method: 'POST', credentials: 'include' });
          await mutateProfile(); // Refresh profile immediately
          // Remove success parameter from URL
          window.history.replaceState({}, '', '/dashboard/premium');
          showNotification('Congratulations! Welcome to VIP!', 'success', 'Premium Activated');
        } catch (e) {
          setError((e as Error)?.message || String(e));
        }
      })();
    }
  }, [mutateProfile]);

  async function upgrade() {
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) {
        // Better error message
        const errorMsg = data.error || 'Checkout failed';
        if (errorMsg.includes('STRIPE_PRICE_ID')) {
          throw new Error('Premium subscription is not configured yet. Please contact support.');
        }
        throw new Error(errorMsg);
      }
      location.href = data.url;
    } catch (e: unknown) {
      alert((e as Error)?.message || String(e));
    }
  }

  async function manageBilling() {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open portal');
      location.href = data.url;
    } catch (e: unknown) {
      alert((e as Error)?.message || String(e));
    }
  }

  if (isLoading) {
    return (
      <div className="github-container">
        <div className="github-loading">
          <div className="github-spinner"></div>
          <p>Loading premium status...</p>
        </div>
      </div>
    );
  }

  const isPremium = !!profile?.isPremium;
  
  return (
    <div className="github-container">
      <div className="github-page-header">
        <h1 className="github-page-title">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 8 }}>
            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
          </svg>
          Premium
        </h1>
        <p className="github-page-description">
          {isPremium 
            ? 'Thank you for supporting RiseUP with a premium subscription!' 
            : 'Unlock premium features and support development'}
        </p>
      </div>

      {error && (
        <div style={{ 
          padding: '12px 16px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          borderRadius: '8px',
          marginBottom: '24px',
          color: '#ef4444'
        }}>
          {error}
        </div>
      )}

      <div className="github-card">
        {isPremium ? (
          <>
            <div style={{ 
              padding: '16px', 
              background: 'linear-gradient(135deg, rgba(31, 111, 235, 0.2), rgba(16, 185, 129, 0.2))', 
              border: '1px solid rgba(31, 111, 235, 0.3)',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <svg width="48" height="48" viewBox="0 0 16 16" fill="#10b981" style={{ marginBottom: 8 }}>
                <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
              </svg>
              <h3 style={{ margin: '0 0 8px 0' }}>Premium Active</h3>
              <p className="muted" style={{ margin: 0 }}>You have full access to all premium features</p>
            </div>

            <h3>Premium Benefits</h3>
            <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Priority Support</strong> - Get faster responses to your reclamations
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Advanced AI Features</strong> - Enhanced grading and learning assistance
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Unlimited Tasks</strong> - Create and manage unlimited learning tasks
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Offline Mode</strong> - Enhanced offline capabilities for learning on-the-go
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Early Access</strong> - Be the first to try new features
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Ad-Free Experience</strong> - Enjoy RiseUP without interruptions
              </li>
            </ul>

            <button className="github-btn" onClick={manageBilling}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6 }}>
                <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>
                <path d="M8 3.5a.75.75 0 01.75.75v3.69l2.28 1.52a.75.75 0 01-.76 1.29L7.49 9.19a.75.75 0 01-.24-.19l-.01-.01a.75.75 0 01-.24-.55V4.25A.75.75 0 018 3.5z"/>
              </svg>
              Manage Billing & Subscription
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <svg width="64" height="64" viewBox="0 0 16 16" fill="rgba(31, 111, 235, 0.6)" style={{ marginBottom: 16 }}>
                <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
              </svg>
              <h3 style={{ margin: '0 0 8px 0' }}>Upgrade to Premium</h3>
              <p className="muted">Get access to exclusive features and support the development of RiseUP</p>
            </div>

            <div style={{ 
              background: 'var(--panel-2)', 
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent)' }}>
                  $9.99
                  <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--muted)' }}>/month</span>
                </div>
              </div>

              <h4 style={{ marginTop: 24 }}>What&apos;s Included:</h4>
              <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
                <li style={{ marginBottom: 8 }}>✨ Priority Support</li>
                <li style={{ marginBottom: 8 }}>🤖 Advanced AI Features</li>
                <li style={{ marginBottom: 8 }}>📝 Unlimited Tasks</li>
                <li style={{ marginBottom: 8 }}>📴 Enhanced Offline Mode</li>
                <li style={{ marginBottom: 8 }}>🚀 Early Access to New Features</li>
                <li style={{ marginBottom: 8 }}>🎯 Ad-Free Experience</li>
                <li style={{ marginBottom: 8 }}>💬 Priority Reclamation Resolution</li>
              </ul>

              <button 
                className="github-btn github-btn-primary" 
                onClick={upgrade}
                style={{ width: '100%', fontSize: '16px', padding: '12px' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 8 }}>
                  <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                </svg>
                Upgrade to Premium
              </button>
            </div>

            <div style={{ 
              padding: '12px 16px', 
              background: 'rgba(59, 130, 246, 0.1)', 
              border: '1px solid rgba(59, 130, 246, 0.3)', 
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--muted)',
              textAlign: 'center'
            }}>
              💡 Cancel anytime. No long-term commitment required.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
