'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signUp, checkEmailExists } from '@/lib/auth-client';
import FormInput from '@/components/FormInput';
import PasswordInput from '@/components/PasswordInput';

export default function SignupPage() {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exists, setExists] = useState<boolean | null>(null);
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
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Signup failed');
      }

      // Redirect to login page (they'll be redirected to onboarding after login)
      router.push('/auth/login');
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
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Join RiseUP to start your journey</p>
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
              label="Name" 
              type="text" 
              placeholder="Full name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />

            <FormInput 
              label="Email" 
              type="email" 
              placeholder="you@company.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              status={exists === null ? null : exists ? 'error' : 'ok'} 
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
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>

            <div className="auth-links">
              <span style={{ color: 'var(--muted)' }}>Already have an account?</span>
              <a href="/auth/login" className="auth-link auth-link-primary">Sign in</a>
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
