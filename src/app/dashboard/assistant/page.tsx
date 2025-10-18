"use client";

import { useEffect, useRef, useState } from 'react';

type ChatMsg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function ChallengeBotPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Describe your challenge, attach a screenshot or solution file, then click Send. I’ll grade it.' },
  ]);
  const [input, setInput] = useState('');
  const [upload, setUpload] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // auto-scroll to bottom on new messages
    const el = document.getElementById('chat-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function onSend() {
    if (busy) return;
    if (!input && !upload && !image) return;
    const userMsg: ChatMsg = { role: 'user', content: input || '(no message)' };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('message', input);
      if (upload) fd.append('file', upload);
      if (image) fd.append('screenshot', image);
      const res = await fetch('/api/assistant/analyze', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Request failed');
      }
      const data = await res.json();
      const parts: string[] = [];
      if (data.analysis) parts.push(data.analysis);
      if (typeof data.score === 'number') parts.push(`Score: ${data.score}/100`);
      if (typeof data.passed === 'boolean') parts.push(data.passed ? 'Result: Pass ✅' : 'Result: Fail ❌');
      if (data.hints?.length) parts.push('Hints:\n- ' + data.hints.join('\n- '));
      if (data.source) {
        const label = data.source === 'gemini' ? 'Gemini' : data.source === 'groq' ? 'Groq' : 'Heuristic';
        parts.push(`Grader: ${label}`);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: parts.join('\n\n') || 'Processed.' }]);
    } catch (e: unknown) {
      const msg = (e as Error)?.message || 'Something went wrong';
      setMessages((prev) => [...prev, { role: 'assistant', content: `error: ${msg}` }]);
    } finally {
      setBusy(false);
      setInput('');
      setUpload(null);
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  }

  return (
    <div className="github-container">
      <div className="github-page-header">
        <div>
          <h1 className="github-page-title">Challenge Bot 🤖</h1>
          <p className="github-page-description">Upload a screenshot for visual confirmation or attach your solution file to get an automatic heuristic grade.</p>
        </div>
      </div>

      <div className="github-chat-panel">
        <div id="chat-scroll" className="github-chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`github-chat-message ${m.role === 'user' ? 'github-chat-user' : 'github-chat-assistant'}`}>
              <div className="github-chat-role">{m.role === 'user' ? '👤 You' : m.role === 'assistant' ? '🤖 Challenge Bot' : 'System'}</div>
              <div className="github-chat-content">{m.content}</div>
            </div>
          ))}
        </div>

        <div className="github-chat-input-area">
          <input
            className="github-chat-input"
            placeholder="Describe the challenge or paste requirements here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend(); }}
          />
          <div className="github-chat-actions">
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setImage(e.currentTarget.files?.[0] || null)} />
            <button className="github-btn" onClick={() => imgInputRef.current?.click()} disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h.94a.76.76 0 01.03-.03l6.077-6.078a1.75 1.75 0 012.412-.06L14.5 10.31V2.75a.25.25 0 00-.25-.25H1.75zm12.5 11H4.81l5.048-5.047a.25.25 0 01.344-.009l4.298 3.889v.917a.25.25 0 01-.25.25z"/>
                <circle cx="6.5" cy="6.5" r="1.5"/>
              </svg>
              Screenshot
            </button>
            <input ref={fileInputRef} type="file" accept=".zip,.js,.ts,.tsx,.jsx,.py,.sql,.java,.php,.txt,.md" style={{ display: 'none' }} onChange={(e) => setUpload(e.currentTarget.files?.[0] || null)} />
            <button className="github-btn" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
              </svg>
              Attach file
            </button>
            <button className="github-btn-primary" onClick={onSend} disabled={busy}>
              {busy ? (
                <>
                  <div className="github-spinner-sm" />
                  Analyzing…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M.989 8L.064 2.68a1.342 1.342 0 011.85-1.462l13.402 5.744a1.13 1.13 0 010 2.076L1.913 14.782a1.343 1.343 0 01-1.85-1.463L.99 8.002z"/>
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>

          {(image || upload) && (
            <div className="github-chat-attachments">
              {image && (
                <div className="github-attachment-tag">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h.94a.76.76 0 01.03-.03l6.077-6.078a1.75 1.75 0 012.412-.06L14.5 10.31V2.75a.25.25 0 00-.25-.25H1.75z"/>
                  </svg>
                  {image.name} ({Math.round(image.size/1024)} KB)
                </div>
              )}
              {upload && (
                <div className="github-attachment-tag">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/>
                  </svg>
                  {upload.name} ({Math.round(upload.size/1024)} KB)
                </div>
              )}
            </div>
          )}

          <div className="github-chat-hint">
            💡 Tip: Press <kbd>Ctrl+Enter</kbd> to send. Max file size 5 MB.
          </div>
        </div>
      </div>
    </div>
  );
}
