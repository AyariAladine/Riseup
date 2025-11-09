'use client';

import { notFound, useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaRegCalendarAlt, FaRegClock, FaCheckCircle, FaRegLightbulb } from 'react-icons/fa';

type Task = {
  _id: string;
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  dueAt?: string | Date;
  completed?: boolean;
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${resolvedParams.id}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          router.push('/dashboard/tasks');
          return;
        }
        const data = await res.json();
        setTask(data.task || data);
      } catch (error) {
        console.error('Failed to fetch task:', error);
        router.push('/dashboard/tasks');
      } finally {
        setLoading(false);
      }
    }
    fetchTask();
  }, [resolvedParams.id, router]);

  if (loading) {
    return (
      <div className="github-loading">
        <div className="github-spinner" />
        <p>Loading task...</p>
      </div>
    );
  }

  if (!task) return null;

  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isCompleted = !!task.completed;
  const difficultyColor = {
    easy: '#10b981',
    medium: '#f59e42',
    hard: '#ef4444',
  }[(task.difficulty || 'medium') as 'easy' | 'medium' | 'hard'];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg)',
      padding: '24px 16px',
      paddingBottom: 80
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header Card */}
        <div className="github-card" style={{ marginBottom: 20, padding: '32px 24px' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
            marginBottom: 20
          }}>
            <div className="github-card-icon" style={{ 
              width: 56, 
              height: 56,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)'
            }}>
              <FaRegLightbulb size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                fontSize: 28, 
                fontWeight: 700, 
                margin: 0, 
                marginBottom: 16,
                color: 'var(--fg)',
                lineHeight: 1.2
              }}>
                {task.title}
              </h1>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--panel-2)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 14,
                  color: 'var(--fg)',
                  border: '1px solid var(--border)'
                }}>
                  <FaRegCalendarAlt style={{ color: 'var(--muted)' }} />
                  {dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--panel-2)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 14,
                  color: 'var(--fg)',
                  border: '1px solid var(--border)'
                }}>
                  <FaRegClock style={{ color: 'var(--muted)' }} />
                  {dueDate ? dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </div>
                
                <span style={{
                  background: difficultyColor,
                  color: 'white',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase'
                }}>
                  {task.difficulty || 'medium'}
                </span>
                
                {isCompleted && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    <FaCheckCircle size={14} /> Completed
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div style={{ 
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid var(--border)',
              fontSize: 15, 
              color: 'var(--muted)', 
              lineHeight: 1.6
            }}>
              {task.description}
            </div>
          )}
          
          {!task.description && (
            <div style={{ 
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid var(--border)',
              fontSize: 14,
              color: 'var(--muted)',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ fontSize: 18 }}>📝</span> No description provided for this task.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}>
          <Link
            href={{
              pathname: '/dashboard/assistant',
              query: { task: encodeURIComponent(JSON.stringify(task)) },
            }}
            className="github-card github-card-interactive"
            style={{ padding: 20 }}
          >
            <div className="github-card-icon github-card-icon-assistant" style={{ width: 48, height: 48 }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13h3.5a.75.75 0 010 1.5h-3.5A3.25 3.25 0 010 11.25v-8.5A3.25 3.25 0 011.75 0h8.5A3.25 3.25 0 0113.5 2.75v3.5a.75.75 0 01-1.5 0v-3.5a1.75 1.75 0 00-1.75-1.75h-8.5z"/>
                <path d="M13.854 8.146a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L12.293 9H8.5a.5.5 0 010-1h3.793l-2.147-2.146a.5.5 0 01.708-.708l3 3z"/>
              </svg>
            </div>
            <div className="github-card-content">
              <div className="github-card-title">Assist</div>
              <div className="github-card-description">Get AI help with this task</div>
            </div>
            <div className="github-card-arrow">→</div>
          </Link>

          <Link
            href={{
              pathname: '/learn',
              query: { task: encodeURIComponent(JSON.stringify(task)) },
            }}
            className="github-card github-card-interactive"
            style={{ padding: 20 }}
          >
            <div className="github-card-icon github-card-icon-learn" style={{ width: 48, height: 48 }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0114.25 13H8.06l-2.573 2.573A1.458 1.458 0 013 14.543V13H1.75A1.75 1.75 0 010 11.25v-9.5zM1.75 1.5a.25.25 0 00-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h6.5a.25.25 0 00.25-.25v-9.5a.25.25 0 00-.25-.25H1.75z"/>
              </svg>
            </div>
            <div className="github-card-content">
              <div className="github-card-title">Learn</div>
              <div className="github-card-description">Interactive learning resources</div>
            </div>
            <div className="github-card-arrow">→</div>
          </Link>

          <Link
            href={{
              pathname: '/dashboard/quiz',
              query: { task: encodeURIComponent(JSON.stringify(task)) },
            }}
            className="github-card github-card-interactive"
            style={{ padding: 20 }}
          >
            <div className="github-card-icon" style={{ 
              width: 48, 
              height: 48,
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)'
            }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 01-1.484.211c-.04-.282-.163-.547-.37-.847a8.695 8.695 0 00-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.75.75 0 01-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75zM6 15.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75zM5.75 12a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z"/>
              </svg>
            </div>
            <div className="github-card-content">
              <div className="github-card-title">Take Quiz</div>
              <div className="github-card-description">Test your knowledge</div>
            </div>
            <div className="github-card-arrow">→</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
