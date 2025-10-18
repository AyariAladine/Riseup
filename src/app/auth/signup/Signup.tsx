'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');

  router.push('/auth/login');
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
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 22 }}>Create your account</h1>

          {error && <p style={{ color: '#ff6b6b', marginBottom: 12 }}>{error}</p>}

          <FormInput label="Name" type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />

          <div style={{ marginTop: 12 }}>
            <FormInput label="Email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} status={exists === null ? null : exists ? 'ok' : 'error'} required />
          </div>

          <div style={{ marginTop: 12 }}>
            <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="/auth/login" className="link small">Already have an account? Log in</a>
          </div>
        </form>
      </div>
    </div>
  );
}
