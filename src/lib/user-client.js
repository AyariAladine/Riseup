"use client";
import { useSyncExternalStore } from 'react';

function ensureGlobals() {
  if (typeof window === 'undefined') return;
  const w = window;
  if (!w.__EMITTER__) {
    // Try to restore user from sessionStorage on first load
    const cached = sessionStorage.getItem('app:user');
    w.__USER__ = cached ? (() => { try { return JSON.parse(cached); } catch { return null; } })() : null;
    w.__EMITTER__ = new EventTarget();
  }
}

export function setUser(user) {
  if (typeof window === 'undefined') return;
  ensureGlobals();
  const w = window;
  w.__USER__ = user;
  
  // Persist to sessionStorage
  try {
    if (user) {
      sessionStorage.setItem('app:user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('app:user');
    }
  } catch (e) {
    console.error('Failed to persist user to sessionStorage:', e);
  }
  
  try {
    w.__EMITTER__.dispatchEvent(new CustomEvent('user-changed', { detail: user }));
  } catch {
    // ignore - some platforms may not allow CustomEvent dispatching
  }
}

export function useUser() {
  ensureGlobals();
  const getSnapshot = () => (typeof window === 'undefined' ? null : window.__USER__);
  const subscribe = (cb) => {
    if (typeof window === 'undefined') return () => {};
    const listener = () => cb();
    window.__EMITTER__.addEventListener('user-changed', listener);
    return () => window.__EMITTER__.removeEventListener('user-changed', listener);
  };
  const user = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { user };
}

export default useUser;
