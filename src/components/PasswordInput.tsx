import React, { useState } from 'react';
import FormInput from './FormInput';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; status?: 'ok' | 'error' | null };

export default function PasswordInput({ label = 'Password', hint, status = null, ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <FormInput label={label} hint={hint} status={status} {...props} type={show ? 'text' : 'password'} />
      <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 8, top: 36, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </button>
    </div>
  );
}
