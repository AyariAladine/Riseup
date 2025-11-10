import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  status?: 'ok' | 'error' | null;
};

export default function FormInput({ label, hint, status = null, className = '', ...props }: Props) {
  return (
    <div style={{ position: 'relative', display: 'block', width: '100%' }}>
      {label && (
        <label htmlFor={props.id} className="form-label" style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontSize: '14px', 
          fontWeight: 500, 
          color: 'var(--fg)',
          transition: 'color 0.2s ease'
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input 
          {...props} 
          className={`form-input ${status ? `form-input-${status}` : ''} ${className}`}
          style={{
            width: '100%',
            padding: '12px 16px',
            paddingRight: status ? '40px' : '16px',
            fontSize: '16px', // Prevents zoom on iOS
            lineHeight: '1.5',
            border: `1px solid ${status === 'error' ? '#f85149' : status === 'ok' ? '#3fb950' : 'var(--border)'}`,
            borderRadius: '8px',
            background: 'var(--panel)',
            color: 'var(--fg)',
            transition: 'all 0.2s ease',
            outline: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            ...props.style
          }}
        />
        {status === 'ok' && (
          <span style={{ 
            position: 'absolute', 
            right: '14px', 
            top: '50%',
            transform: 'translateY(-50%)', 
            color: '#3fb950',
            fontSize: '18px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            animation: 'fadeIn 0.3s ease'
          }}>
            ✓
          </span>
        )}
        {status === 'error' && (
          <span style={{ 
            position: 'absolute', 
            right: '14px', 
            top: '50%',
            transform: 'translateY(-50%)', 
            color: '#f85149',
            fontSize: '18px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            animation: 'shake 0.4s ease'
          }}>
            ✕
          </span>
        )}
      </div>
      {hint && (
        <div style={{ 
          marginTop: '6px', 
          fontSize: '13px', 
          color: 'var(--muted)',
          lineHeight: '1.4'
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
