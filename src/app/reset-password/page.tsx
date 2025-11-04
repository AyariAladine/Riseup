"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/auth-client';

type FormEvent = React.FormEvent<HTMLFormElement>;

function ResetPasswordInner() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const params = useSearchParams();
  const router = useRouter();

  const token = params?.get('token') || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);
    
    if (!token) {
      setMessage('Invalid or missing reset token');
      setIsSuccess(false);
      return;
    }
    
    try {
      const result = await resetPassword({
        newPassword: password,
        token: token,
      });
      
      if (result.error) {
        throw new Error(result.error.message || 'Reset failed');
      }
      
      setMessage('Password reset successful — redirecting to login...');
      setIsSuccess(true);
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
      setIsSuccess(false);
    }
  };

  const hasMin = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const allGood = hasMin && hasNumber && hasSpecial;

  useEffect(() => {
    if (!token) {
      setMessage('Invalid reset link');
      setIsSuccess(false);
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 20 }}>Reset your password</h1>
          {message && <p style={{ color: isSuccess ? '#7ee787' : '#ff6b6b', marginBottom: 12 }}>{message}</p>}
          <label style={{ position: 'relative' }}>
            <div className="small muted">New password</div>
            <input type={showPassword ? 'text' : 'password'} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 8, top: 36, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          </label>
          <ul className="mb-4 small muted" style={{ marginTop: 12 }}>
            <li style={{ color: hasMin ? '#7ee787' : '#ff6b6b' }}>Minimum 8 characters {hasMin ? '✓' : '✕'}</li>
            <li style={{ color: hasNumber ? '#7ee787' : '#ff6b6b' }}>Includes a number {hasNumber ? '✓' : '✕'}</li>
            <li style={{ color: hasSpecial ? '#7ee787' : '#ff6b6b' }}>Includes a special character {hasSpecial ? '✓' : '✕'}</li>
          </ul>
          <button type="submit" className="btn btn-primary" disabled={!allGood} style={{ width: '100%' }}>Set new password</button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
