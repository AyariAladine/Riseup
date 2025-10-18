"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setUser as setGlobalUser } from '@/lib/user-client';
import FormInput from '@/components/FormInput';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exists, setExists] = useState<boolean | null>(null);
  // Note: Password input handles show/hide internally
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    if (!email) return setExists(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const data = await res.json();
        if (!mounted) return;
        setExists(!!data.exists);
      } catch {
        if (!mounted) return;
        setExists(false);
      }
    }, 300);
    return () => { mounted = false; clearTimeout(t); };
  }, [email]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');

  // Clear all old session/storage data before setting new user
  try {
    sessionStorage.clear();
    // Only clear app-specific localStorage keys, not user preferences like theme
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('app:') || key.startsWith('prefetch:') || key.startsWith('cache:'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {}

  // Update global user cache
  setGlobalUser(data.user || null);

  // Server sets HttpOnly cookie with token. Redirect to dashboard.
  router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10"/>
                <path d="M12 20V4"/>
                <path d="M6 20v-6"/>
              </svg>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your RiseUP account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <FormInput 
              label="Email" 
              type="email" 
              placeholder="you@company.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              status={exists === null ? null : exists ? 'ok' : 'error'} 
              required 
            />

            <PasswordInput 
              label="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Logging in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="auth-links">
              <a href="/auth/forgetpassword" className="auth-link">Forgot password?</a>
              <span className="auth-divider">•</span>
              <a href="/auth/signup" className="auth-link auth-link-primary">Create account</a>
            </div>
          </form>
        </div>

        <footer className="auth-footer">
          <span>© 2025 RiseUP</span>
          <span className="auth-divider">•</span>
          <a href="#" className="auth-footer-link">Privacy</a>
          <span className="auth-divider">•</span>
          <a href="#" className="auth-footer-link">Terms</a>
        </footer>
      </div>
    </div>
  );
}
