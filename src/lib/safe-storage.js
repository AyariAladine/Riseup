/**
 * Safe storage utilities that handle quota exceeded errors gracefully
 */

const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB conservative limit

/**
 * Check if storage is approaching quota and clean up if needed
 */
function cleanupStorageIfNeeded() {
  if (typeof window === 'undefined') return;
  
  try {
    // Estimate current storage size
    let totalSize = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        totalSize += key.length + (value?.length || 0);
      }
    }
    
    // If approaching limit (> 3MB), clear old data
    if (totalSize > MAX_STORAGE_SIZE * 0.75) {
      console.warn('Storage cleanup: clearing old session data');
      const keysToKeep = ['app:user', 'theme', 'pwa-install-prompt-seen'];
      const keysToRemove = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch {}
      });
    }
  } catch (e) {
    // Can't measure, just try to clear old data
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('prefetch:') || key.startsWith('cache:') || key.startsWith('temp:'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch {}
  }
}

export function safeStorageGet(key) {
  if (typeof window === 'undefined') return null;
  
  try {
    const value = sessionStorage.getItem(key);
    if (value) return JSON.parse(value);
  } catch (e) {
    // sessionStorage full or unavailable, try localStorage
    try {
      const value = localStorage.getItem(key);
      if (value) return JSON.parse(value);
    } catch {
      // Both failed, return null
    }
  }
  return null;
}

export function safeStorageSet(key, value) {
  if (typeof window === 'undefined') return false;
  
  const jsonValue = JSON.stringify(value);
  
  // Try sessionStorage first (preferred for session data)
  try {
    cleanupStorageIfNeeded();
    sessionStorage.setItem(key, jsonValue);
    return true;
  } catch (e) {
    // sessionStorage failed (quota or unavailable)
    if (process.env.NODE_ENV === 'development') {
      console.warn('sessionStorage unavailable, using localStorage:', e.message);
    }
  }
  
  // Fallback to localStorage with cleanup
  try {
    localStorage.setItem(key, jsonValue);
    return true;
  } catch (quotaError) {
    // Quota exceeded, try to free space
    if (process.env.NODE_ENV === 'development') {
      console.warn('Storage quota exceeded, clearing old data');
    }
    
    try {
      // Clear any old prefetch/cache data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('prefetch:') || k.startsWith('cache:') || k.startsWith('temp:'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
      
      // Try again after cleanup
      localStorage.setItem(key, jsonValue);
      return true;
    } catch (e) {
      console.error('All storage methods failed:', e.message);
      return false;
    }
  }
}

export function safeStorageRemove(key) {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(key);
  } catch {}
  try {
    localStorage.removeItem(key);
  } catch {}
}
