"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const items = [
  { 
    href: '/dashboard', 
    label: 'Home', 
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.906.664a1.749 1.749 0 012.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0113.25 15h-3.5a.75.75 0 01-.75-.75V9H7v5.25a.75.75 0 01-.75.75h-3.5A1.75 1.75 0 011 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2z"/></svg>) 
  },
  { 
    href: '/dashboard/calendar', 
    label: 'Calendar', 
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.75 0a.75.75 0 01.75.75V2h5V.75a.75.75 0 011.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 014.75 0zm0 3.5h8.5a.25.25 0 01.25.25V6h-11V3.75a.25.25 0 01.25-.25h2.5z"/></svg>) 
  },
  { 
    href: '/learn', 
    label: 'Learn', 
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0114.25 13H8.06l-2.573 2.573A1.458 1.458 0 013 14.543V13H1.75A1.75 1.75 0 010 11.25v-9.5zM1.75 1.5a.25.25 0 00-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h6.5a.25.25 0 00.25-.25v-9.5a.25.25 0 00-.25-.25H1.75z"/></svg>) 
  },
  { 
    href: '/dashboard/assistant', 
    label: 'Assistant', 
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13h3.5l2.83 2.83a.75.75 0 001.14-.19l.66-1.31.66 1.31a.75.75 0 001.14.19L14.25 13h.5A1.25 1.25 0 0016 11.75v-9A1.25 1.25 0 0014.75 1.5h-13zm0 10.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v8.5a.25.25 0 01-.25.25h-3.5a.75.75 0 00-.531.22L8 13.72l-2.22-2.22a.75.75 0 00-.53-.22h-3.5z"/><path d="M5 5.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 5.25zM5 8.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5A.75.75 0 015 8.25z"/></svg>) 
  },
  { 
    href: '/dashboard/profile', 
    label: 'Profile', 
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.561 8.073a6.005 6.005 0 003.432-5.142.75.75 0 10-1.498.07 4.5 4.5 0 01-8.99 0 .75.75 0 00-1.498-.07 6.004 6.004 0 003.431 5.142 3.999 3.999 0 00-1.989 3.178.75.75 0 101.493.154 2.5 2.5 0 014.992 0 .75.75 0 101.493-.154 4 4 0 00-1.989-3.178z"/></svg>) 
  },
];

export default function Sidebar() {
  const pathname = usePathname() || '';
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Close drawer when route changes
    const closeDrawer = () => {
      document.body.removeAttribute('data-drawer');
    };
    closeDrawer();
  }, [pathname]);

  const handleLinkClick = () => {
    if (isClient) {
      document.body.removeAttribute('data-drawer');
    }
  };

  const handleBackdropClick = () => {
    if (isClient) {
      document.body.removeAttribute('data-drawer');
    }
  };

  return (
    <>
    <aside className="github-sidebar" id="app-sidebar">
      <nav className="github-sidebar-nav">
        {items.map((it) => {
          const active = isClient && (pathname === it.href || (it.href !== '/dashboard/home' && pathname.startsWith(it.href + '/')));
          return (
            <Link 
              key={it.href} 
              href={it.href} 
              className={`github-sidebar-item${active ? ' active' : ''}`} 
              onClick={handleLinkClick}
            >
              <span className="github-sidebar-icon">{it.icon}</span>
              <span className="github-sidebar-label">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
    <div className="github-backdrop" onClick={handleBackdropClick} />
    </>
  );
}
