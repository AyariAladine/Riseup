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

  // Update global user cache and notify listeners so Header updates immediately
  try {
    sessionStorage.setItem('prefetch:user', JSON.stringify(data.user || null));
    window.dispatchEvent(new CustomEvent('user-prefetched', { detail: data.user || null }));
  } catch {}
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 22 }}>Log in to RiseUP</h1>

          {error && <p style={{ color: '#ff6b6b', marginBottom: 12 }}>{error}</p>}

          <FormInput label="Email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} status={exists === null ? null : exists ? 'ok' : 'error'} required />

          <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <a href="/auth/forgetpassword" className="link small">Forgot password?</a>
            <a href="/auth/signup" className="link small">Sign up</a>
          </div>
        </form>
      </div>
    </div>
  );
}
