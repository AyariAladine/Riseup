"use client";
import { useEffect, useRef } from 'react';
import { useUser } from '@/lib/user-client';

/**
 * Detects when a user logs in and triggers the after-login notification endpoint
 * This handles both OAuth (Google) and credential logins
 */
export default function LoginNotifier() {
  const { user } = useUser();
  const hasNotified = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger if:
    // 1. User just logged in (wasn't logged in before)
    // 2. We haven't already notified for this session
    // 3. User ID exists
    const currentUserId = (user as any)?.id || (user as any)?._id;
    
    if (currentUserId && !hasNotified.current && lastUserId.current !== currentUserId) {
      console.log('[LoginNotifier] User logged in, triggering notification:', currentUserId);
      
      // Mark as notified for this session
      hasNotified.current = true;
      lastUserId.current = currentUserId;
      
      // Call the after-login endpoint to trigger notification
      fetch('/api/after-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => {
        console.error('[LoginNotifier] Failed to trigger after-login:', err);
      });
    }
  }, [user]);

  return null; // This component doesn't render anything
}
