"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomBar() {
  const path = usePathname() || '/dashboard';
  const items = [
    { href: '/dashboard', label: 'Home', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { href: '/dashboard/tasks', label: 'Tasks', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L20 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.2"/></svg>) },
    { href: '/dashboard/assistant', label: 'Bot', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2"/><path d="M8 12h8M9 15h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>) },
    { href: '/learn', label: 'Learn', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.2"/><path d="M8 10h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>) },
  { href: '/dashboard/premium', label: 'Premium', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.39 4.84L20 8l-4 3.9L17 18l-5-2.6L7 18l1-6.1L4 8l5.61-1.16L12 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
  ];

  return (
    <nav className="bottom-bar">
      {items.map(it => {
        const active = path === it.href || path.startsWith(it.href + '/');
        return (
          <Link key={it.href} href={it.href} className={`bottom-item ${active ? 'active' : ''}`}>
            <div className="bottom-icon">{it.icon}</div>
            <div className="bottom-label">{it.label}</div>
          </Link>
        );
      })}
      <style jsx>{`
        .bottom-bar { position: fixed; left:0; right:0; bottom:0; height:64px; display:none; background: var(--panel); border-top: 1px solid rgba(255,255,255,0.03); backdrop-filter: blur(6px); z-index:60; }
        .bottom-item { display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--muted); text-decoration:none; width:20%; height:100%; }
        .bottom-item.active { color:var(--fg); }
        .bottom-icon { width:22px; height:22px; }
        .bottom-label { font-size:11px; margin-top:4px; }
        @media (max-width: 720px) { .bottom-bar { display:flex; } body { padding-bottom: 84px; } }
      `}</style>
    </nav>
  );
}
