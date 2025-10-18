"use client";
import { useSyncExternalStore } from 'react';
import { safeStorageGet, safeStorageSet, safeStorageRemove } from './safe-storage';

function ensureGlobals() {
  if (typeof window === 'undefined') return;
  const w = window;
  if (!w.__EMITTER__) {
    // Try to restore user from storage on first load
    w.__USER__ = safeStorageGet('app:user');
    w.__EMITTER__ = new EventTarget();
  }
}

export function setUser(user) {
  if (typeof window === 'undefined') return;
  ensureGlobals();
  const w = window;
  w.__USER__ = user;
  
  // Persist to storage
  if (user) {
    safeStorageSet('app:user', user);
  } else {
    safeStorageRemove('app:user');
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
