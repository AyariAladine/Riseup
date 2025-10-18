"use client";

import { useEffect, useRef, useState } from 'react';

type ChatMsg = { role: 'user' | 'assistant'; content: string; source?: 'gemini' | 'offline' | 'groq' };

export default function LearnPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: "I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function onSend() {
    if (busy) return;
    if (!input.trim()) return;
    const userMsg: ChatMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);
    try {
      const res = await fetch('/api/learn/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || '...', source: data.source }]);
    } catch (e: unknown) {
      const msg = (e as Error)?.message || 'Something went wrong';
      setMessages((prev) => [...prev, { role: 'assistant', content: `error: ${msg}` }]);
    } finally {
      setBusy(false);
      setInput('');
    }
  }

  return (
    <div className="github-container">
      <div className="github-page-header">
        <h1 className="github-page-title">Learn</h1>
        <p className="github-page-description">Ask questions about programming, setup, or best practices. I'll provide step-by-step guidance.</p>
      </div>

      <div className="github-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13h3.5l2.83 2.83a.75.75 0 001.14-.19l.66-1.31.66 1.31a.75.75 0 001.14.19L14.25 13h.5A1.25 1.25 0 0016 11.75v-9A1.25 1.25 0 0014.75 1.5h-13z"/>
            </svg>
            <strong>Tutor</strong>
          </div>
          <p className="small muted" style={{ margin: '8px 0 0 0' }}>I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you.</p>
        </div>

        <div ref={scrollRef} style={{ height: 500, overflow: 'auto', padding: 16, background: 'var(--panel)' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="small" style={{ fontWeight: 600, color: m.role === 'user' ? 'var(--accent)' : 'var(--fg)' }}>
                {m.role === 'user' ? '👤 You' : `🤖 Tutor${m.source ? ` (${m.source})` : ''}`}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', padding: '8px 12px', background: m.role === 'user' ? 'rgba(31, 111, 235, 0.1)' : 'var(--panel-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, background: 'var(--panel-2)', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <textarea
                placeholder="Ask anything (e.g., Install VS Code on Windows, Learn OOP in Python, Why use virtualenv?)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend(); }}
                style={{ 
                  width: '100%', 
                  minHeight: 60, 
                  resize: 'vertical',
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'var(--panel)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <div className="small muted" style={{ marginTop: 6 }}>
                💡 Tip: Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send
              </div>
            </div>
            <button className="github-btn github-btn-primary" onClick={onSend} disabled={busy} style={{ height: 40 }}>
              {busy ? (
                <>
                  <div className="github-spinner-sm" style={{ marginRight: 8 }} />
                  Thinking...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6 }}>
                    <path d="M1.75 2.5a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75zm0 5a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75zM1 13.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H1.75a.75.75 0 01-.75-.75z"/>
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}