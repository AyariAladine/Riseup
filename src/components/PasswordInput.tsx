import React, { useState } from 'react';
import FormInput from './FormInput';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; status?: 'ok' | 'error' | null };

export default function PasswordInput({ label = 'Password', hint, status = null, ...props }: Props) {
  const [show, setShow] = useState(false);
  
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <FormInput 
        label={label} 
        hint={hint} 
        status={status} 
        {...props} 
        type={show ? 'text' : 'password'}
        style={{
          ...props.style,
          paddingRight: '48px' // Make room for toggle button
        }}
      />
      <button 
        type="button" 
        aria-label={show ? 'Hide password' : 'Show password'} 
        onClick={() => setShow(s => !s)} 
        style={{ 
          position: 'absolute', 
          right: '12px', 
          top: label ? '38px' : '50%',
          transform: label ? 'none' : 'translateY(-50%)',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent', 
          border: 'none', 
          color: 'var(--muted)', 
          cursor: 'pointer',
          borderRadius: '6px',
          transition: 'all 0.2s ease',
          WebkitTapHighlightColor: 'transparent'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(88, 166, 255, 0.1)';
          e.currentTarget.style.color = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--muted)';
        }}
      >
        {show ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21.28 8.34A10.5 10.5 0 0017.94 4M9.9 4.24A9 9 0 012 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  );
}
