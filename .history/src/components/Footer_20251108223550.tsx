"use client";
import { useEffect, useState } from 'react';

export default function Footer() {
  const getSystemTheme = () => {
    if (typeof window === 'undefined') return 'dark';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  };

  // Initialize theme from localStorage or system preference, with SSR-safe default
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    // During SSR, always return 'dark'
    if (typeof window === 'undefined') return 'dark';
    // On client, get from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    return savedTheme || getSystemTheme();
  });

  // Remove the separate mount effect since initialization is handled in useState
  useEffect(() => {
    // Just make sure the theme is set correctly on mount
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
      const initialTheme = savedTheme || getSystemTheme();
      if (theme !== initialTheme) {
        setTheme(initialTheme);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (!localStorage.getItem('theme')) {
        setTheme(mq.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <footer className="site-footer" style={{ padding: '18px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 32 }}>
      <div className="header-inner" style={{ padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="small muted">© 2025 RiseUP</div>
        <div className="row small" style={{ alignItems: 'center', gap: 12 }}>
          <span className="muted">Theme</span>
          <button
            className="btn btn-ghost small"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );

}