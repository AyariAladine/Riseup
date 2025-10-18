import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  status?: 'ok' | 'error' | null;
};

export default function FormInput({ label, hint, status = null, className = '', ...props }: Props) {
  return (
    <label style={{ position: 'relative', display: 'block' }}>
      {label && <div className="small muted">{label}</div>}
      <input {...props} className={className} />
      {status === 'ok' && <span style={{ position: 'absolute', right: 12, top: 36, color: '#7ee787' }}>✓</span>}
      {status === 'error' && <span style={{ position: 'absolute', right: 12, top: 36, color: '#ff6b6b' }}>✕</span>}
      {hint && <div className="small muted" style={{ marginTop: 8 }}>{hint}</div>}
    </label>
  );
}
