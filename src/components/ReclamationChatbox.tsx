'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import useSWR from 'swr';
import { Send, Bot, User, Loader2, Trash2, X } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ReclamationChatboxProps {
  reclamationId: string;
  onTicketDeleted?: () => void; // Add callback for when ticket is deleted
}

interface ChatMessage {
  _id?: string;
  role: string;
  content: string;
  timestamp?: string | Date;
  sourceModel?: string;
}

export default function ReclamationChatbox({ reclamationId, onTicketDeleted }: ReclamationChatboxProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatData, error, mutate } = useSWR(
    reclamationId ? `/api/reclamations/${reclamationId}/chat` : null,
    fetcher,
    { 
      revalidateOnFocus: false,
      refreshInterval: 2000
    }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatData?.chatHistory, isTyping]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setIsTyping(true);
    const userMessage = message;
    setMessage('');

    try {
      const response = await fetch('/api/reclamations/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reclamationId, message: userMessage }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      setTimeout(async () => {
        await mutate();
        setIsTyping(false);
      }, 1000);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setMessage(userMessage);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reclamations/${reclamationId}/chat`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) throw new Error('Failed to delete message');
      
      await mutate();
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message. Please try again.');
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear the entire chat history? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🧹 Clearing chat for:', reclamationId);
      
      // First clear locally for immediate feedback
      await mutate({ ...chatData, chatHistory: [] }, false);
      
      // Call API to clear on server
      const response = await fetch(`/api/reclamations/${reclamationId}/chat`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Failed to clear chat: ${response.status}`);
      }

      console.log('✅ Chat cleared successfully');
      
      // Refresh data from server
      await mutate();
      
    } catch (err) {
      console.error('💥 Clear chat failed:', err);
      alert(`Failed to clear chat: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Revert local changes if API failed
      await mutate();
    }
  };

  // NEW: Handle ticket deletion
  const handleDeleteTicket = async () => {
    if (!confirm('Are you sure you want to delete this entire ticket? This action cannot be undone and will remove all chat history.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting ticket:', reclamationId);
      
      const response = await fetch(`/api/reclamations/${reclamationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('🔍 Delete ticket response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete ticket error:', errorText);
        throw new Error(`Failed to delete ticket: ${response.status}`);
      }

      console.log('✅ Ticket deleted successfully');
      
      // Call the callback to update parent component
      if (onTicketDeleted) {
        onTicketDeleted();
      }
      
      // Optional: Show success message
      alert('Ticket deleted successfully!');
      
    } catch (err) {
      console.error('💥 Delete ticket failed:', err);
      alert(`Failed to delete ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const chatHistory = chatData?.chatHistory || [];

  const formatTime = (timestamp: string | Date | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: 'white'
      }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#FEF2F2',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Bot style={{ width: '32px', height: '32px', color: '#DC2626' }} />
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            Connection Error
          </h3>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      backgroundColor: 'white' 
    }}>
      {/* Chat Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#2563EB',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot style={{ width: '16px', height: '16px', color: 'white' }} />
          </div>
          <div>
            <h3 style={{ 
              fontWeight: '600', 
              color: '#111827',
              fontSize: '16px',
              margin: 0
            }}>
              AI Support Assistant
            </h3>
            <p style={{ 
              color: '#10B981', 
              fontSize: '12px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#10B981',
                borderRadius: '50%'
              }}></span>
              Online - Ready to help
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* REMOVE TICKET BUTTON */}
          <button
            onClick={handleDeleteTicket}
            style={{
              background: '#EF4444',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#DC2626';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Delete entire ticket"
          >
            <X style={{ width: '16px', height: '16px' }} />
            Remove Ticket
          </button>

          {/* CLEAR CHAT BUTTON */}
          {chatHistory.length > 0 && (
            <button
              onClick={handleClearChat}
              style={{
                background: '#6B7280',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#6B7280';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Clear chat history only"
            >
              <Trash2 style={{ width: '16px', height: '16px' }} />
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px', 
        backgroundColor: '#F9FAFB' 
      }}>
        {chatHistory.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#DBEAFE',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Bot style={{ width: '32px', height: '32px', color: '#2563EB' }} />
            </div>
            <h3 style={{ 
              fontWeight: '600', 
              color: '#111827',
              fontSize: '18px',
              margin: '0 0 8px 0'
            }}>
              Let's Solve Your Issue!
            </h3>
            <p style={{ 
              color: '#6B7280', 
              fontSize: '14px',
              maxWidth: '320px',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Hi! I'm your AI support assistant. Describe your issue and I'll help you find a solution. Feel free to ask questions!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chatHistory.map((msg: ChatMessage, idx: number) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={msg._id || idx} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    animation: 'fadeIn 0.3s ease-out',
                    position: 'relative'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px',
                    maxWidth: '70%',
                    position: 'relative'
                  }}>
                    {!isUser && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#2563EB',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '4px'
                      }}>
                        <Bot style={{ width: '16px', height: '16px', color: 'white' }} />
                      </div>
                    )}
                    
                    <div 
                      style={{
                        padding: '12px 16px',
                        borderRadius: '16px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        position: 'relative',
                        maxWidth: '100%',
                        ...(isUser ? {
                          backgroundColor: '#2563EB',
                          color: 'white',
                          borderBottomRightRadius: '4px'
                        } : {
                          backgroundColor: 'white',
                          color: '#111827',
                          border: '1px solid #E5E7EB',
                          borderBottomLeftRadius: '4px'
                        })
                      }}
                      onMouseEnter={(e) => {
                        if (isUser && msg._id) {
                          const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                          if (deleteBtn) deleteBtn.style.opacity = '1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isUser && msg._id) {
                          const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                          if (deleteBtn) deleteBtn.style.opacity = '0';
                        }
                      }}
                    >
                      {msg.content}
                      <div style={{
                        fontSize: '11px',
                        opacity: 0.7,
                        marginTop: '8px',
                        textAlign: isUser ? 'right' : 'left'
                      }}>
                        {formatTime(msg.timestamp)}
                      </div>

                      {/* DELETE BUTTON - INSIDE MESSAGE BUBBLE */}
                      {isUser && msg._id && (
                        <button
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(msg._id!);
                          }}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#DC2626',
                            border: '2px solid white',
                            borderRadius: '50%',
                            padding: '4px',
                            cursor: 'pointer',
                            opacity: 0,
                            transition: 'opacity 0.2s, transform 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title="Delete this message"
                        >
                          <Trash2 style={{ width: '12px', height: '12px', color: 'white' }} />
                        </button>
                      )}
                    </div>

                    {isUser && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#6B7280',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '4px'
                      }}>
                        <User style={{ width: '16px', height: '16px', color: 'white' }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#2563EB',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bot style={{ width: '16px', height: '16px', color: 'white' }} />
                  </div>
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '16px',
                    borderBottomLeftRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#9CA3AF',
                        borderRadius: '50%',
                        animation: 'bounce 1.4s infinite'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#9CA3AF',
                        borderRadius: '50%',
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '0.1s'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#9CA3AF',
                        borderRadius: '50%',
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '0.2s'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ 
        borderTop: '1px solid #E5E7EB', 
        padding: '16px' 
      }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message... (Ask questions, describe issues, etc.)"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '14px',
                backgroundColor: isLoading ? '#F3F4F6' : 'white'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563EB';
                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            style={{
              backgroundColor: isLoading || !message.trim() ? '#9CA3AF' : '#2563EB',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              cursor: isLoading || !message.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isLoading && message.trim()) {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && message.trim()) {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }
            }}
          >
            {isLoading ? (
              <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Send style={{ width: '16px', height: '16px' }} />
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Make delete button always visible on mobile */
        @media (max-width: 768px) {
          .delete-btn {
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}