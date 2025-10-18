"use client";

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    // 401 is expected when not logged in, return null instead of throwing
    if (res.status === 401) {
      return null;
    }
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000, // Dedupe requests within 1 minute
        focusThrottleInterval: 60000, // Throttle focus revalidation to 1 minute
        errorRetryCount: 2,
        shouldRetryOnError: false,
        // Use localStorage to persist cache across page refreshes
        provider: () => {
          if (typeof window === 'undefined') return new Map();
          
          // Try to get cache from localStorage
          try {
            const cache = localStorage.getItem('app-cache');
            return cache ? new Map(JSON.parse(cache)) : new Map();
          } catch {
            return new Map();
          }
        },
        onSuccess: () => {
          // Persist cache to localStorage on successful fetch
          if (typeof window !== 'undefined') {
            try {
              const cache = Array.from((window as any).__SWR_CACHE__ || new Map());
              localStorage.setItem('app-cache', JSON.stringify(cache));
            } catch {
              // Ignore localStorage errors
            }
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
