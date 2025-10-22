'use client';

import { useState, FormEvent, useEffect } from 'react';
import { forgetPassword, checkEmailExists } from '@/lib/auth-client';
import FormInput from '@/components/FormInput';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exists, setExists] = useState<boolean | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await forgetPassword({
        email,
        redirectTo: '/reset-password',
      });

      if (result.error) {
        throw new Error(result.error.message || 'Error sending reset link');
      }

      setMessage('Check your email for the reset link');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setExists(null);
      if (!email) return setExists(null);
      try {
        const exists = await checkEmailExists(email);
        if (!mounted) return;
        setExists(exists);
      } catch {
        if (!mounted) return;
        setExists(false);
      }
    };
    const t = setTimeout(check, 300);
    return () => { mounted = false; clearTimeout(t); };
  }, [email]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">We'll send you a reset link</p>
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
            
            {message && (
              <div className="auth-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <span>{message}</span>
              </div>
            )}

            <FormInput 
              label="Email" 
              type="email" 
              placeholder="you@company.com" 
              value={email} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
              status={exists === null ? null : exists ? 'ok' : 'error'} 
              required 
            />

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </button>

            <div className="auth-links">
              <a href="/auth/login" className="auth-link">← Back to login</a>
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
