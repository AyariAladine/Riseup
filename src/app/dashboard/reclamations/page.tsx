'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import ReclamationChatbox from '@/components/ReclamationChatbox';
import { Plus, Search, Filter, Calendar, User, Clock, AlertCircle, CheckCircle, MoreVertical } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Reclamation {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  createdAt: string;
  updatedAt: string;
  chatHistory?: Array<{ role: string; content: string }>;
}

export default function ReclamationsPage() {
  const router = useRouter();
  const [selectedReclamation, setSelectedReclamation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketData, setNewTicketData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium'
  });
  
  const { data, error, mutate, isLoading } = useSWR(
    '/api/reclamations',
    fetcher,
    { revalidateOnFocus: false }
  );

  const reclamations: Reclamation[] = data?.reclamations || [];
  const selectedRec = reclamations.find((r) => r._id === selectedReclamation);

  // FIXED: Handle new ticket creation with better error handling
  const handleCreateNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Creating ticket with data:', newTicketData);
      
      const response = await fetch('/api/reclamations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicketData),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to create ticket: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Ticket created successfully:', result);
      
      // Reset form and update UI
      setNewTicketData({ title: '', description: '', category: 'other', priority: 'medium' });
      setShowNewTicketForm(false);
      
      if (result.reclamation?._id) {
        setSelectedReclamation(result.reclamation._id);
      }
      
      // Refresh the list
      mutate();
      
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert(`Failed to create ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Rest of your existing code remains the same...
  const getStatusStyle = (status: string) => {
    const styles = {
      pending: { borderColor: '#EAB308', backgroundColor: '#FEF9C3', textColor: '#713F12' },
      'in-progress': { borderColor: '#3B82F6', backgroundColor: '#DBEAFE', textColor: '#1E3A8A' },
      resolved: { borderColor: '#10B981', backgroundColor: '#D1FAE5', textColor: '#047857' },
      closed: { borderColor: '#6B7280', backgroundColor: '#F3F4F6', textColor: '#374151' }
    };
    return styles[status as keyof typeof styles] || styles.closed;
  };

  const getPriorityStyle = (priority: string) => {
    const styles = {
      low: { dotColor: '#9CA3AF', textColor: '#6B7280' },
      medium: { dotColor: '#F59E0B', textColor: '#92400E' },
      high: { dotColor: '#EF4444', textColor: '#DC2626' }
    };
    return styles[priority as keyof typeof styles] || styles.low;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter tickets based on search
  const filteredTickets = reclamations.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid #2563EB',
            borderTop: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6B7280' }}>Loading tickets...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#F9FAFB' 
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ 
          padding: '16px 24px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#111827',
                margin: 0
              }}>
                Support Tickets
              </h1>
              <p style={{ 
                color: '#6B7280', 
                margin: '4px 0 0 0'
              }}>
                {reclamations.length} total tickets
              </p>
            </div>
            <button 
              onClick={() => setShowNewTicketForm(!showNewTicketForm)}
              style={{
                backgroundColor: '#2563EB',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              <span>New Ticket</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 88px)'
      }}>
        {/* Sidebar - Tickets List */}
        <div style={{ 
          width: '384px', 
          backgroundColor: 'white', 
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search */}
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #E5E7EB' 
          }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ 
                width: '16px', 
                height: '16px', 
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF'
              }} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '16px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '14px'
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

            {/* New Ticket Form */}
            {showNewTicketForm && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>
                  Create New Ticket
                </h4>
                <form onSubmit={handleCreateNewTicket} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Ticket title *"
                    value={newTicketData.title}
                    onChange={(e) => setNewTicketData({...newTicketData, title: e.target.value})}
                    required
                    minLength={3}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <textarea
                    placeholder="Describe your issue... *"
                    value={newTicketData.description}
                    onChange={(e) => setNewTicketData({...newTicketData, description: e.target.value})}
                    required
                    minLength={10}
                    rows={3}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={newTicketData.category}
                      onChange={(e) => setNewTicketData({...newTicketData, category: e.target.value})}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="bug">🐛 Bug</option>
                      <option value="feature-request">✨ Feature</option>
                      <option value="support">🆘 Support</option>
                      <option value="billing">💳 Billing</option>
                      <option value="other">❓ Other</option>
                    </select>
                    <select
                      value={newTicketData.priority}
                      onChange={(e) => setNewTicketData({...newTicketData, priority: e.target.value})}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        backgroundColor: '#2563EB',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Create Ticket
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewTicketForm(false)}
                      style={{
                        flex: 1,
                        backgroundColor: '#6B7280',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Tickets List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto' 
          }}>
            {filteredTickets.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '128px',
                color: '#6B7280',
                padding: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <AlertCircle style={{ width: '24px', height: '24px' }} />
                </div>
                <p style={{ fontSize: '14px', margin: 0, textAlign: 'center' }}>
                  {searchTerm ? 'No tickets match your search' : 'No tickets found'}
                </p>
                {!searchTerm && (
                  <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#9CA3AF' }}>
                    Create your first ticket to get started
                  </p>
                )}
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {filteredTickets.map((ticket) => {
                  const statusStyle = getStatusStyle(ticket.status);
                  const priorityStyle = getPriorityStyle(ticket.priority);
                  const isSelected = selectedReclamation === ticket._id;
                  
                  return (
                    <div
                      key={ticket._id}
                      onClick={() => setSelectedReclamation(ticket._id)}
                      style={{
                        padding: '16px',
                        borderLeft: `4px solid ${statusStyle.borderColor}`,
                        borderTopRightRadius: '8px',
                        borderBottomRightRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        marginBottom: '8px',
                        backgroundColor: isSelected ? '#DBEAFE' : statusStyle.backgroundColor,
                        border: isSelected ? '1px solid #BFDBFE' : '1px solid #E5E7EB'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = statusStyle.backgroundColor;
                        }
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <h3 style={{ 
                          fontWeight: '600', 
                          color: '#111827', 
                          fontSize: '14px',
                          lineHeight: '1.4',
                          flex: 1,
                          paddingRight: '8px',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {ticket.title}
                        </h3>
                        <button style={{ 
                          color: '#9CA3AF', 
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#6B7280'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                        >
                          <MoreVertical style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                      
                      <p style={{ 
                        color: '#6B7280', 
                        fontSize: '14px', 
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        marginBottom: '12px',
                        margin: 0
                      }}>
                        {ticket.description}
                      </p>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#6B7280'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            color: priorityStyle.textColor
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: priorityStyle.dotColor,
                              marginRight: '4px'
                            }}></span>
                            {ticket.priority}
                          </span>
                          <span style={{ textTransform: 'capitalize' }}>
                            {ticket.category}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar style={{ width: '12px', height: '12px' }} />
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Chat or Empty State */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          {selectedRec ? (
            <ReclamationChatbox reclamationId={selectedRec._id} />
          ) : (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'white'
            }}>
              <div style={{ 
                textAlign: 'center', 
                maxWidth: '384px',
                padding: '32px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <AlertCircle style={{ width: '32px', height: '32px', color: '#9CA3AF' }} />
                </div>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#111827',
                  margin: '0 0 8px 0'
                }}>
                  {reclamations.length === 0 ? 'No Tickets Yet' : 'No Ticket Selected'}
                </h3>
                <p style={{ 
                  color: '#6B7280', 
                  fontSize: '14px',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  {reclamations.length === 0 
                    ? 'Create your first support ticket to get started with AI assistance.' 
                    : 'Select a ticket from the list to view details and start a conversation.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}