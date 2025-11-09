"use client";

import { useEffect, useRef, useState } from 'react';

type Task = {
  _id: string;
  title: string;
  description?: string;
  difficulty?: string;
  dueAt?: string | Date;
  completed?: boolean;
};

type ChatMsg = { role: 'user' | 'assistant'; content: string; source?: 'gemini' | 'offline' | 'groq' };
type Conversation = { id: string; title: string; messageCount: number; lastMessage: string; updatedAt: string };

export default function LearnPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: "I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [askFocus, setAskFocus] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

  async function handleFocusTask(yes: boolean) {
    setAskFocus(false);
    if (yes && focusTask) {
      // Add a learning-focused introduction about the task
      const assistantMsg: ChatMsg = {
        role: 'assistant',
        content: `Let's learn about: **${focusTask.title}**\n\n${focusTask.description || ''}\n\nI'm here to guide you through learning the concepts and skills needed for this task. Feel free to ask me:\n- What concepts you need to understand\n- How to approach the problem\n- Explanations of related topics\n- Step-by-step guidance\n\nWhat would you like to learn first?`
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    }
  }

  // Load conversations list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-save current conversation
  useEffect(() => {
    if (!currentConversationId || messages.length === 0) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatType: 'learn',
            conversationId: currentConversationId,
            messages
          })
        });
        // Reload conversations to update the list
        loadConversations();
      } catch (error) {
        console.error('Failed to save conversation:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [messages, currentConversationId]);

  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations?type=learn');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations?type=learn&id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setCurrentConversationId(id);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  async function createNewConversation() {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatType: 'learn',
          title: 'New Conversation',
          messages: [{ role: 'assistant', content: "I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you." }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation.id);
        setMessages([{ role: 'assistant', content: "I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you." }]);
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }

  async function deleteConversation(id: string) {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await fetch(`/api/conversations?type=learn&id=${id}`, { method: 'DELETE' });
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([{ role: 'assistant', content: "I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you." }]);
      }
      loadConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

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

  async function clearHistory() {
    if (!currentConversationId) return;
    if (!confirm('Clear this conversation? This cannot be undone.')) return;
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatType: 'learn',
          conversationId: currentConversationId,
          messages: [{ role: 'assistant', content: "I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you." }]
        })
      });
      setMessages([{ role: 'assistant', content: "I'm your learning tutor. Ask about coding, setup, or concepts, and I'll guide you." }]);
      loadConversations();
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      alert('Failed to clear conversation');
    }
  }

  return (
    <div className="github-container">
      {askFocus && focusTask && (
        <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, margin: 24, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Do you want to learn about this task?</div>
          <div style={{ marginBottom: 8 }}>
            <strong>{focusTask.title}</strong>
            <div style={{ color: '#64748b', fontSize: 15 }}>{focusTask.description}</div>
          </div>
          <button onClick={() => handleFocusTask(true)} style={{ marginRight: 10, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600 }}>Yes</button>
          <button onClick={() => handleFocusTask(false)} style={{ background: '#e5e7eb', color: '#334155', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 600 }}>No</button>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .learn-layout { flex-direction: column !important; }
          .learn-sidebar { width: 100% !important; max-width: 100% !important; }
          .learn-main { width: 100% !important; }
          .learn-header-actions { flex-direction: column; gap: 8px; width: 100%; }
          .learn-header-actions button { width: 100%; }
        }
      `}</style>
      <div className="github-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="github-page-title">Learn</h1>
            <p className="github-page-description">Ask questions about programming, setup, or best practices.</p>
          </div>
          {mounted && (
            <button className="github-btn" onClick={() => setShowSidebar(!showSidebar)} style={{ fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"/>
              </svg>
              {showSidebar ? 'Hide' : 'Show'} Conversations
            </button>
          )}
        </div>
      </div>

      <div className="learn-layout" style={{ display: 'flex', gap: 16 }}>
        {/* Conversations Sidebar */}
        {mounted && showSidebar && (
          <div className="learn-sidebar" style={{ width: 280, flexShrink: 0 }}>
            <div className="github-card" style={{ padding: 12 }}>
              <button className="github-btn github-btn-primary" onClick={createNewConversation} style={{ width: '100%', marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
                </svg>
                New Conversation
              </button>
              <div style={{ maxHeight: 600, overflow: 'auto' }}>
                {conversations.length === 0 ? (
                  <div className="small muted" style={{ textAlign: 'center', padding: 20 }}>
                    No conversations yet
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      style={{
                        padding: 10,
                        marginBottom: 8,
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: currentConversationId === conv.id ? 'var(--accent-alpha)' : 'var(--panel)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>{conv.title}</div>
                          <div className="small muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {conv.lastMessage || 'No messages'}
                          </div>
                          <div className="small muted" style={{ fontSize: 10, marginTop: 4 }}>
                            {conv.messageCount} messages
                          </div>
                        </div>
                        <button
                          className="github-btn"
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          style={{ padding: '2px 6px', fontSize: 11 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="learn-main" style={{ flex: 1 }}>
          <div className="github-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13h3.5l2.83 2.83a.75.75 0 001.14-.19l.66-1.31.66 1.31a.75.75 0 001.14.19L14.25 13h.5A1.25 1.25 0 0016 11.75v-9A1.25 1.25 0 0014.75 1.5h-13z"/>
                  </svg>
                  <strong>Tutor</strong>
                </div>
                <button className="github-btn" onClick={clearHistory} style={{ fontSize: '12px', padding: '4px 8px' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 4 }}>
                    <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z"/>
                  </svg>
                  Clear History
                </button>
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
              <style>{`
                @media (max-width: 640px) {
                  .learn-input-area { flex-direction: column !important; align-items: stretch !important; }
                  .learn-input-area button { width: 100%; }
                }
              `}</style>
              <div className="learn-input-area" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
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
      </div>
    </div>
  );
}