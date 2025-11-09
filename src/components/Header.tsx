"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useUser, setUser as setUserGlobal } from '@/lib/user-client';
import { signOut } from '@/lib/auth-client';
import Image from 'next/image';

export default function Header() {
  const { user } = useUser();
  const [localUser, setLocalUser] = useState<{ name?: string; email?: string; avatar?: string; isPremium?: boolean } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const u = user as unknown as { name?: string; email?: string; avatar?: string; isPremium?: boolean } | null;
    setLocalUser(u || null);
    // Stop loading once we have user data or confirmed no user
    setIsLoading(false);
  }, [user]);

  // Fetch online/offline status from API
  useEffect(() => {
    if (!localUser) return;
    (async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        if (!res.ok) {
          // 401 is expected when not logged in, silently ignore
          if (res.status === 401) return;
          return;
        }
        const data = await res.json();
        setIsOnline(Boolean(data.user?.preferences?.isOnline ?? true));
      } catch {
        // Silently ignore network errors
      }
    })();
  }, [localUser]);

  // keep header in sync when profile updates are emitted elsewhere
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = ((e as CustomEvent).detail || {}) as Partial<typeof localUser>;
      setLocalUser((prev) => (prev ? { ...prev, ...detail } : prev));
      const u = (user as unknown as Record<string, unknown>) || {};
      setUserGlobal({ ...u, ...detail });
    };
    window.addEventListener('profile-updated', handler as EventListener);
    return () => window.removeEventListener('profile-updated', handler as EventListener);
  }, [user]);

  // Listen for online/offline status changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = ((e as CustomEvent).detail || {}) as { isOnline?: boolean };
      if (detail.isOnline !== undefined) {
        setIsOnline(detail.isOnline);
      }
    };
    window.addEventListener('status-updated', handler as EventListener);
    return () => window.removeEventListener('status-updated', handler as EventListener);
  }, []);

  // Drawer toggle: notify listeners (Sidebar)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('drawer-toggle', { detail: { open: drawerOpen } }));
    } catch {}
    if (typeof document !== 'undefined') {
      // Both mobile and desktop: 'open' attribute when drawer is open
      if (drawerOpen) document.body.setAttribute('data-drawer', 'open');
      else document.body.removeAttribute('data-drawer');
    }
  }, [drawerOpen]);

  // Listen for drawer being closed from elsewhere (clicking main content, etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const observer = new MutationObserver(() => {
      const isOpen = document.body.hasAttribute('data-drawer');
      if (isOpen !== drawerOpen) {
        setDrawerOpen(isOpen);
      }
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-drawer']
    });
    
    return () => observer.disconnect();
  }, [drawerOpen]);

  // close menu on outside click or ESC
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const premium = !!localUser?.isPremium;

  return (
    <header className="github-header" suppressHydrationWarning>
      <div className="github-header-inner" suppressHydrationWarning>
        <div className="github-header-left">
          <button 
            aria-label="Open menu" 
            onClick={() => setDrawerOpen(v => !v)} 
            className="github-menu-btn"
          >
            <svg className="github-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 110 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 110 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 100 1.5h12.5a.75.75 0 100-1.5H1.75z" />
            </svg>
          </button>

          <Link href={mounted && localUser ? "/dashboard" : "/"} className="github-brand">
            <div className="github-logo-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" className="github-logo-svg">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
            </div>
            <div className="github-brand-text">
              <span className="github-brand-name">RiseUP</span>
            </div>
          </Link>
        </div>

        <div className="github-header-right" suppressHydrationWarning>
          {!mounted || isLoading ? (
            // Loading skeleton to prevent hydration mismatch and show loading state
            <div style={{ width: 100, height: 32, background: 'var(--panel)', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : localUser ? (
            <>
      
              <div className="github-user-menu" ref={menuRef}>
                <button 
                  aria-haspopup="menu" 
                  aria-expanded={menuOpen} 
                  onClick={() => setMenuOpen(v => !v)} 
                  className="github-user-btn"
                >
                  <div className="github-avatar" style={{ position: 'relative' }}>
                    {localUser.avatar ? (
                      <Image 
                        src={localUser.avatar} 
                        alt="avatar" 
                        width={32} 
                        height={32} 
                        className="github-avatar-img"
                        unoptimized={localUser.avatar.startsWith('data:')}
                      />
                    ) : (
                      <div className="github-avatar-fallback">{localUser.name?.slice(0,1).toUpperCase() || 'U'}</div>
                    )}
                    {/* Small status dot on avatar */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: isOnline ? '#10b981' : '#6b7280',
                      border: '2px solid var(--bg)',
                      boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
                    }} />
                  </div>
                  <span className="github-username">{localUser.name}</span>
                  <svg className="github-dropdown-arrow" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
                  </svg>
                </button>

              {menuOpen && (
                <div role="menu" className="github-dropdown">
                  <div className="github-dropdown-header">
                    <div className="github-dropdown-user-info">
                      <div className="github-dropdown-name">{localUser.name}</div>
                      <div className="github-dropdown-email">{localUser.email}</div>
                    </div>
                  </div>
                  <div className="github-dropdown-divider" />
                  <Link href="/dashboard/profile" className="github-dropdown-item">
                    <svg className="github-dropdown-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M10.561 8.073a6.005 6.005 0 003.432-5.142.75.75 0 10-1.498.07 4.5 4.5 0 01-8.99 0 .75.75 0 00-1.498-.07 6.004 6.004 0 003.431 5.142 3.999 3.999 0 00-1.989 3.178.75.75 0 101.493.154 2.5 2.5 0 014.992 0 .75.75 0 101.493-.154 4 4 0 00-1.989-3.178z" />
                    </svg>
                    Your profile
                  </Link>
                  <Link href="/dashboard/premium" className="github-dropdown-item">
                    <svg className="github-dropdown-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                    </svg>
                    {premium ? 'Premium' : 'Upgrade to Premium'}
                  </Link>
                  <div className="github-dropdown-divider" />
                  <button onClick={async () => { 
                    await signOut(); 
                    // Clear all caches
                    if ('caches' in window) {
                      const cacheNames = await caches.keys();
                      await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }
                    // Clear session/local storage
                    sessionStorage.clear();
                    localStorage.clear();
                    // Redirect to login page only
                    window.location.href = '/auth/login';
                  }} className="github-dropdown-item">
                    <svg className="github-dropdown-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm10.44 4.5H6.75a.75.75 0 000 1.5h5.69l-1.97 1.97a.75.75 0 101.06 1.06l3.25-3.25a.75.75 0 000-1.06l-3.25-3.25a.75.75 0 10-1.06 1.06l1.97 1.97z" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
          ) : (
            <div className="github-header-actions">
              <Link href="/auth/login" className="github-btn">Log in</Link>
              <Link href="/auth/signup" className="github-btn-primary">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
