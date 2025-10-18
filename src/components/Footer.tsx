"use client";
import { useEffect, useState } from 'react';

export default function Footer() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  return (
    <footer className="site-footer" style={{ padding: '18px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 32 }}>
      <div className="header-inner" style={{ padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="small muted">© {new Date().getFullYear()} RiseUP</div>
        <div className="row small" style={{ alignItems: 'center', gap: 12 }}>
          <span className="muted">Theme</span>
          <button className="btn btn-ghost small" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>
    </footer>
  );
}
