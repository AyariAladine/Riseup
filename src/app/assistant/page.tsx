"use client";

import { useEffect, useRef, useState } from 'react';

type ChatMsg = { role: 'user' | 'assistant'; content: string; source?: 'gemini' | 'offline' | 'groq' };

type Task = {
  _id: string;
  title: string;
  description?: string;
  difficulty?: string;
  dueAt?: string | Date;
  completed?: boolean;
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: "I'm your assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [askFocus, setAskFocus] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // On mount, check for task in query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const taskParam = params.get('task');
      if (taskParam) {
        try {
          const task: Task = JSON.parse(decodeURIComponent(taskParam));
          setFocusTask(task);
          setAskFocus(true);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function handleFocusTask(yes: boolean) {
    setAskFocus(false);
    if (yes && focusTask) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Focusing on task: ${focusTask.title}\n${focusTask.description || ''}` }
      ]);
    }
  }

  async function onSend() {
    if (busy) return;
    if (!input.trim()) return;
    const userMsg: ChatMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);
    try {
      // Replace with your assistant API call
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'This is a mock reply.' }]);
        setBusy(false);
        setInput('');
      }, 800);
    } catch (e: unknown) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `error: Something went wrong` }]);
      setBusy(false);
      setInput('');
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Assistant</h1>
      {askFocus && focusTask && (
        <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, marginBottom: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Do you want to focus on this task?</div>
          <div style={{ marginBottom: 8 }}>
            <strong>{focusTask.title}</strong>
            <div style={{ color: '#64748b', fontSize: 15 }}>{focusTask.description}</div>
          </div>
          <button onClick={() => handleFocusTask(true)} style={{ marginRight: 10, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600 }}>Yes</button>
          <button onClick={() => handleFocusTask(false)} style={{ background: '#e5e7eb', color: '#334155', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600 }}>No</button>
        </div>
      )}
      <div ref={scrollRef} style={{ height: 350, overflow: 'auto', background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 600, color: m.role === 'user' ? '#6366f1' : '#0f172a' }}>
              {m.role === 'user' ? '👤 You' : `🤖 Assistant${m.source ? ` (${m.source})` : ''}`}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', padding: '8px 12px', background: m.role === 'user' ? '#e0e7ff' : '#f1f5f9', borderRadius: 6, border: '1px solid #e5e7eb' }}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend(); }}
          style={{ flex: 1, minHeight: 40, resize: 'vertical', padding: '10px 12px', borderRadius: 6, border: '1px solid #e5e7eb', outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={onSend} disabled={busy} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0 24px', fontWeight: 600, height: 40 }}>
          {busy ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
