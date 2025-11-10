"use client";

import { useState, FormEvent, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { setUser as setGlobalUser } from '@/lib/user-client';
import { signIn, checkEmailExists, twoFactor } from '@/lib/auth-client';
import FormInput from '@/components/FormInput';
import PasswordInput from '@/components/PasswordInput';
import AuthExtras from './AuthExtras';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exists, setExists] = useState<boolean | null>(null);
  const [require2FA, setRequire2FA] = useState<boolean>(false);
  const [totpCode, setTotpCode] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    if (!email) return setExists(null);
    const t = setTimeout(async () => {
      try {
        const exists = await checkEmailExists(email);
        if (!mounted) return;
        setExists(exists);
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
      const result = await signIn.email({
        email,
        password,
      });

      console.log('Login result:', result);

      if (result.error) {
        // Check if 2FA is required via error message
        if (result.error.message?.includes('two factor') || result.error.message?.includes('2FA') || result.error.message?.includes('verification')) {
          setRequire2FA(true);
          setError('Please enter your 2FA code');
          setLoading(false);
          return;
        }
        throw new Error(result.error.message || 'Login failed');
      }

      // Check if we have a valid session - if not, might need 2FA
      if (!result.data?.user && (result.data as any)?.requiresTwoFactor !== false) {
        // No user session returned, likely needs 2FA
        setRequire2FA(true);
        setError('');
        setLoading(false);
        return;
      }

      // Clear all old session/storage data before setting new user
      try {
        sessionStorage.clear();
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('app:') || key.startsWith('prefetch:') || key.startsWith('cache:'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch {}

      // Update global user cache with better-auth user data
      if (result.data?.user) {
        setGlobalUser({
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name,
        });
      }

      // Send post-login actions (notification will be rate-limited on backend)
      try {
        await fetch('/api/after-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: result.data?.user?.id,
            userName: result.data?.user?.name,
          }),
        });
      } catch (err) {
        console.error('Failed to process after-login:', err);
      }

      // Server sets HttpOnly cookie with token. Redirect to dashboard.
      // Dashboard will show onboarding modal if needed
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await twoFactor.verifyTotp({
        code: totpCode,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Invalid 2FA code');
      }

      // Clear storage and redirect
      try {
        sessionStorage.clear();
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('app:') || key.startsWith('prefetch:') || key.startsWith('cache:'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch {}

      // Send post-2FA actions (notification will be rate-limited on backend)
      try {
        await fetch('/api/after-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Failed to process after-login:', err);
      }

      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" suppressHydrationWarning>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Image 
                src="/144.png" 
                alt="RiseUP Logo" 
                width={72} 
                height={72}
                priority
                style={{ borderRadius: '16px' }}
              />
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your RiseUP account</p>
          </div>
          {!require2FA ? (
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
              {/* Client-only extras (social login, etc.) */}
              <AuthExtras />
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="auth-form">
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

              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(37, 99, 235, 0.1)', borderRadius: 8, border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>Two-Factor Authentication</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <FormInput 
                label="Authentication Code" 
                type="text" 
                placeholder="123456" 
                value={totpCode} 
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                maxLength={6}
                required
                style={{ fontSize: '18px', letterSpacing: '8px', textAlign: 'center' }}
              />

              <button type="submit" className="btn btn-primary auth-submit" disabled={loading || totpCode.length !== 6}>
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign in'
                )}
              </button>

              <div className="auth-links">
                <button 
                  type="button"
                  onClick={() => {
                    setRequire2FA(false);
                    setTotpCode('');
                    setError('');
                  }}
                  className="auth-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← Back to login
                </button>
              </div>
            </form>
          )}
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
