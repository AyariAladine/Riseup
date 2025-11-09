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

type ChatMsg = { role: 'user' | 'assistant' | 'system'; content: string };
type Conversation = { id: string; title: string; messageCount: number; lastMessage: string; updatedAt: string };

export default function ChallengeBotPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Describe your challenge, attach a screenshot or solution file, then click Send. I will grade it.' },
  ]);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [askFocus, setAskFocus] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
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
      // Send a system message to the assistant to understand this is a task challenge
      const taskContext = `TASK CHALLENGE: ${focusTask.title}\nDescription: ${focusTask.description || 'No description provided'}\nDifficulty: ${focusTask.difficulty || 'medium'}\n\nInstructions: This is a coding challenge. Wait for the user to provide their solution (code, file, or screenshot). When they submit their answer, grade it based on the task requirements. Provide detailed feedback, score (0-100), and hints if they didn't pass.`;
      
      const systemMsg: ChatMsg = {
        role: 'system',
        content: taskContext
      };
      
      const assistantMsg: ChatMsg = {
        role: 'assistant',
        content: `I'm ready to grade your challenge: **${focusTask.title}**\n\n${focusTask.description || ''}\n\nPlease submit your solution by:\n- Describing your approach\n- Attaching a screenshot of your code\n- Uploading your solution file\n\nOnce you submit, I'll grade your work and provide feedback!`
      };
      
      setMessages(prev => [...prev, systemMsg, assistantMsg]);
    }
  }
  const [input, setInput] = useState('');
  const [upload, setUpload] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // Don't save if there are no messages or only the initial assistant message
    if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant')) return;
    
    // Auto-save conversation after 2 seconds of inactivity
    const timeoutId = setTimeout(async () => {
      try {
        const conversationTitle = focusTask?.title || messages[0]?.content?.slice(0, 50) || 'Challenge Session';
        
        const savePayload: any = {
          title: conversationTitle,
          messages: messages
        };
        
        // If we have a current conversation ID, update it; otherwise create new
        if (currentConversationId) {
          savePayload.id = currentConversationId;
        }
        
        // If we have a focusTask, include taskId for grading history
        if (focusTask?._id) {
          savePayload.taskId = focusTask._id;
        }
        
        const res = await fetch('/api/grading-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload)
        });
        
        if (res.ok) {
          const data = await res.json();
          // Set the conversation ID if this was a new conversation
          if (!currentConversationId && data.id) {
            setCurrentConversationId(data.id);
          }
          loadConversations();
        }
      } catch (error) {
        console.error('Failed to auto-save conversation:', error);
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [messages, currentConversationId, focusTask]);

  async function loadConversations() {
    try {
      const res = await fetch('/api/grading-history');
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
      const res = await fetch(`/api/grading-history?id=${id}`);
      console.log('Fetching conversation:', `/api/grading-history?id=${id}`);
      const raw = await res.clone().text();
      console.log('Raw response:', raw);
      if (res.ok) {
        const data = await res.json();
        console.log('Conversation API response:', data);
        setMessages(data.messages || []);
        setCurrentConversationId(id);
      } else {
        const errorText = await res.text();
        console.error('Conversation API error:', res.status, errorText);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  async function createNewConversation() {
    try {
      const res = await fetch('/api/grading-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Challenge',
          messages: [{ role: 'assistant', content: 'Describe your challenge, attach a screenshot or solution file, then click Send. I will grade it.' }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation.id);
        setMessages([{ role: 'assistant', content: 'Describe your challenge, attach a screenshot or solution file, then click Send. I will grade it.' }]);
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }

  function confirmDeleteConversation(id: string) {
    setConversationToDelete(id);
    setDeleteModalOpen(true);
  }

  async function deleteConversation() {
    if (!conversationToDelete) return;
    try {
      await fetch(`/api/grading-history?id=${conversationToDelete}`, { method: 'DELETE' });
      if (currentConversationId === conversationToDelete) {
        setCurrentConversationId(null);
        setMessages([{ role: 'assistant', content: 'Describe your challenge, attach a screenshot or solution file, then click Send. I will grade it.' }]);
      }
      loadConversations();
      setDeleteModalOpen(false);
      setConversationToDelete(null);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  useEffect(() => {
    const el = document.getElementById('chat-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function onSend() {
    if (busy) return;
    // Don't send if there's no content at all
    if (!input?.trim() && !upload && !image) return;
    
    const userMsg: ChatMsg = { role: 'user', content: input || '(no message)' };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('message', input);
      if (upload) fd.append('file', upload);
      if (image) fd.append('screenshot', image);
      // Pass task context if available
      if (focusTask) {
        fd.append('taskContext', JSON.stringify(focusTask));
      }
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
      if (data.taskCompleted) {
        parts.push('\n🎉 **TASK COMPLETED!**\nYour NFT achievement badge is being minted on Hedera blockchain!');
      }
      if (data.hints?.length) parts.push('Hints:\n- ' + data.hints.join('\n- '));
      if (data.source) {
        const label = data.source === 'gemini' ? 'Gemini' : data.source === 'groq' ? 'Groq' : data.source === 'validation' ? 'Validation' : 'Heuristic';
        parts.push(`Grader: ${label}`);
      }
      const assistantResponse = parts.join('\n\n') || 'Processed.';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantResponse }]);
      
      // Auto-save will handle saving the conversation via useEffect
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

  useEffect(() => {
    console.log('Rendering messages:', messages);
  }, [messages]);

  return (
    <div className="github-container">
      {askFocus && focusTask && (
        <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, margin: 24, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Do you want to focus on this challenge?</div>
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
          .assistant-layout { flex-direction: column !important; }
          .assistant-sidebar { width: 100% !important; max-width: 100% !important; }
          .assistant-main { width: 100% !important; }
          .github-chat-actions { flex-wrap: wrap; }
          .github-chat-actions button { flex: 1 1 auto; min-width: 100px; }
        }
      `}</style>
      <div className="github-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="github-page-title">Challenge Bot</h1>
            <p className="github-page-description">Upload a screenshot or attach your solution file for automatic grading.</p>
            {focusTask && !askFocus && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 6, fontSize: 13 }}>
                <strong>📌 Focused Task:</strong> {focusTask.title}
              </div>
            )}
          </div>
          {mounted && (
            <button className="github-btn" onClick={() => setShowSidebar(!showSidebar)} style={{ fontSize: 14, padding: '6px 12px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"/>
              </svg>
              {showSidebar ? 'Hide' : 'Show'} Conversations
            </button>
          )}
        </div>
      </div>

      <div className="assistant-layout" style={{ display: 'flex', gap: 16 }}>
        {/* Mobile backdrop */}
        {mounted && showSidebar && (
          <div 
            className="sidebar-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 998,
              display: 'none'
            }}
            onClick={() => setShowSidebar(false)}
          />
        )}
        
        {mounted && showSidebar && (
          <div className={`assistant-sidebar ${showSidebar ? 'show' : ''}`} style={{ width: 280, flexShrink: 0 }}>
            <div className="github-card" style={{ padding: 12 }}>
              <button className="github-btn github-btn-primary" onClick={createNewConversation} style={{ width: '100%', marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
                </svg>
                New Challenge
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
                          onClick={(e) => { e.stopPropagation(); confirmDeleteConversation(conv.id); }}
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

        <div className="assistant-main" style={{ flex: 1 }}>
          <div className="github-chat-panel">
            <div id="chat-scroll" className="github-chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`github-chat-message ${m.role === 'user' ? 'github-chat-user' : 'github-chat-assistant'}`}>
                  <div className="github-chat-role">{m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Challenge Bot' : 'System'}</div>
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
                      Analyzing...
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
                Tip: Press Ctrl+Enter to send. Max file size 5 MB.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setDeleteModalOpen(false)}
        >
          <div 
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>
              Delete Conversation?
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--muted)', lineHeight: 1.5 }}>
              This conversation will be permanently deleted. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                className="github-btn"
                onClick={() => setDeleteModalOpen(false)}
                style={{ 
                  padding: '10px 20px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  minWidth: '100px'
                }}
              >
                Cancel
              </button>
              <button
                className="github-btn"
                onClick={deleteConversation}
                style={{ 
                  padding: '10px 20px',
                  background: '#dc3545',
                  border: '1px solid #dc3545',
                  color: 'white',
                  minWidth: '100px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
