'use client';

import { useState, FormEvent, useEffect } from 'react';
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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
        const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error sending reset link');

      setMessage('Check your email for the reset link (dev: check console)');
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
        const res = await fetch('/api/auth/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const data = await res.json();
        if (!mounted) return;
        setExists(!!data.exists);
      } catch {
        if (!mounted) return;
        setExists(false);
      }
    };
    const t = setTimeout(check, 300);
    return () => { mounted = false; clearTimeout(t); };
  }, [email]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 20 }}>Send password reset</h1>

          {error && <p style={{ color: '#ff6b6b', marginBottom: 12 }}>{error}</p>}
          {message && <p style={{ color: '#7ee787', marginBottom: 12 }}>{message}</p>}

          <FormInput label="Email" type="email" placeholder="you@company.com" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} status={exists === null ? null : exists ? 'ok' : 'error'} required />

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="/auth/login" className="link small">Back to login</a>
          </div>
        </form>
      </div>
    </div>
  );
}
