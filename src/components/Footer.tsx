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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark' | 'light') || getSystemTheme();
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
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
    <footer className="site-footer" style={{ paddingTop: 18, paddingRight: 12, paddingBottom: 18, paddingLeft: 12, borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 32 }}>
      <div className="header-inner" style={{ padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="small muted">© <span suppressHydrationWarning>{mounted ? new Date().getFullYear() : ''}</span> RiseUP</div>
        <div className="row small" style={{ alignItems: 'center', gap: 12 }}>
          <span className="muted">Theme</span>
          <button className="btn btn-ghost small" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            <span suppressHydrationWarning>{mounted ? (theme === 'dark' ? 'Switch to Light' : 'Switch to Dark') : ''}</span>
          </button>
        </div>
      </div>
    </footer>
  );

}