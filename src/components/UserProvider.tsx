"use client";

import { useEffect, useRef } from 'react';
import { setUser } from '@/lib/user-client';
import { usePathname } from 'next/navigation';

/**
 * UserProvider - Initializes and maintains global user state
 * This component should be placed in the root layout to ensure
 * user state is always available across the app
 */
export default function UserProvider() {
  const pathname = usePathname();
  const initRef = useRef(false);

  // Initialize user on mount and when pathname changes
  useEffect(() => {
    const initUser = async () => {
      // Skip on auth pages and splash screen
      if (pathname?.startsWith('/auth') || pathname === '/splash' || pathname === '/') {
        // Don't clear user on splash - it will be set during splash
        if (pathname !== '/splash') {
          setUser(null);
        }
        return;
      }

      try {
        // Check if we already have user data in sessionStorage
        const cached = sessionStorage.getItem('app:user');
        if (cached && !initRef.current) {
          try {
            const userData = JSON.parse(cached);
            setUser(userData);
            initRef.current = true;
          } catch {
            sessionStorage.removeItem('app:user');
          }
        }

        // Fetch fresh user data from API
        const res = await fetch('/api/dashboard', {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            sessionStorage.setItem('app:user', JSON.stringify(data.user));
            initRef.current = true;
          }
        } else {
          // Not authenticated
          setUser(null);
          sessionStorage.removeItem('app:user');
        }
      } catch (error) {
        console.error('UserProvider: Failed to fetch user', error);
        setUser(null);
      }
    };

    initUser();
  }, [pathname]);

  // Listen for manual user updates (e.g., from login/profile pages)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        sessionStorage.setItem('app:user', JSON.stringify(detail));
      } else {
        sessionStorage.removeItem('app:user');
      }
    };

    window.addEventListener('user-changed', handler);
    return () => window.removeEventListener('user-changed', handler);
  }, []);

  return null; // This component doesn't render anything
}
