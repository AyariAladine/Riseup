'use client';

import { notFound, useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaRegCalendarAlt, FaRegClock, FaCheckCircle, FaRegLightbulb, FaTrophy, FaExternalLinkAlt, FaStar, FaDownload } from 'react-icons/fa';
import { showNotification } from "@/components/NotificationProvider";

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
};

type Task = {
  _id: string;
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  skills?: string[];
  estimatedTime?: number;
  dueAt?: string | Date;
  completed?: boolean;
  status?: string;
  score?: number;
  gradeConversation?: Message[];
  gradedAt?: string | Date;
  nftBadgeId?: string;
  nftTokenId?: string;
  nftMetadataUri?: string;
  nftMinted?: boolean;
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingExercise, setDownloadingExercise] = useState(false);

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
        const fetchedTask = data.task || data;
        setTask(fetchedTask);
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
  
  const getBadgeTier = (score: number) => {
    if (score >= 90) return { tier: 'Diamond', color: '#60a5fa', emoji: '💎' };
    if (score >= 75) return { tier: 'Gold', color: '#fbbf24', emoji: '🏆' };
    if (score >= 60) return { tier: 'Silver', color: '#9ca3af', emoji: '🥈' };
    return { tier: 'Bronze', color: '#d97706', emoji: '🥉' };
  };

  // Extract short description (first paragraph or first 200 chars)
  const getShortDescription = (description?: string): string => {
    if (!description) return '';
    // Try to get first paragraph
    const firstParagraph = description.split('\n\n')[0] || description.split('\n')[0] || description;
    // Limit to 200 characters
    if (firstParagraph.length > 200) {
      return firstParagraph.substring(0, 197) + '...';
    }
    return firstParagraph;
  };

  // Download coding exercise
  async function downloadCodingExercise() {
    if (!task) return;
    
    setDownloadingExercise(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}/coding-exercise`, {
        credentials: 'include'
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to generate exercise' }));
        throw new Error(error.error || 'Failed to download exercise');
      }

      // Get the file content
      const blob = await res.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coding-exercise-${task.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Show smooth notification
      showNotification(
        'Coding exercise downloaded successfully!',
        'success',
        'Download Complete'
      );
    } catch (err) {
      console.error('Failed to download exercise:', err);
      showNotification(
        `Failed to download exercise: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'error',
        'Download Failed'
      );
    } finally {
      setDownloadingExercise(false);
    }
  }

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
                    <FaCheckCircle size={14} /> Completed {task.score && `• ${task.score}%`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Short Description */}
          {getShortDescription(task.description) && (
            <div style={{
              marginTop: 20,
              padding: '16px 20px',
              background: 'var(--panel-2)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <p style={{
                margin: 0,
                fontSize: 15,
                color: 'var(--fg)',
                lineHeight: 1.6
              }}>
                {getShortDescription(task.description)}
              </p>
            </div>
          )}
        </div>

        {/* Download Coding Exercise Button - SEPARATE CARD - ALWAYS VISIBLE */}
        <div className="github-card" style={{
          marginBottom: 20,
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.12) 100%)',
          borderRadius: '16px',
          border: '3px solid rgba(16, 185, 129, 0.6)',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.5)',
              flexShrink: 0
            }}>
              <FaDownload size={28} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--fg)'
              }}>
                📥 Download Coding Exercise (.txt)
              </h3>
              <p style={{
                margin: 0,
                fontSize: 15,
                color: 'var(--muted)',
                lineHeight: 1.6
              }}>
                Get a personalized coding problem with a <strong>code template</strong> that you can modify and submit for grading. The file contains fill-in-the-blank code with <code>___</code> or <code>TODO:</code> markers.
              </p>
            </div>
          </div>
          <button
            onClick={downloadCodingExercise}
            disabled={downloadingExercise || !task}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '18px 32px',
              background: downloadingExercise || !task 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '17px',
              fontWeight: '700',
              cursor: downloadingExercise || !task ? 'not-allowed' : 'pointer',
              opacity: downloadingExercise || !task ? 0.6 : 1,
              boxShadow: downloadingExercise || !task 
                ? 'none' 
                : '0 8px 24px rgba(16, 185, 129, 0.6)',
              transition: 'all 0.3s ease',
              width: '100%',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseEnter={(e) => {
              if (!downloadingExercise && task) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.7)';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingExercise && task) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.6)';
              }
            }}
          >
            <FaDownload size={20} />
            {downloadingExercise ? '⏳ Generating Exercise...' : '⬇️ Download Coding Exercise (.txt)'}
          </button>
          <p style={{
            margin: 0,
            marginTop: 12,
            fontSize: 13,
            color: 'var(--muted)',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            💡 The downloaded file will contain a code template with blanks to fill in. Modify it and submit for grading!
          </p>
        </div>

        {/* Description Section */}
        <div className="github-card" style={{ marginBottom: 20, padding: '32px 24px' }}>
          <div style={{ 
            marginBottom: 20,
            paddingBottom: 20,
            borderBottom: '2px solid var(--border)'
          }}>
            <h2 style={{
              margin: 0,
              marginBottom: 16,
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--fg)'
            }}>
              📖 Task Description & Exercises
            </h2>
            
            {task.description ? (
              <div style={{ 
                fontSize: 15, 
                color: 'var(--muted)', 
                lineHeight: 1.8
              }}>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: task.description
                      .replace(/```([\s\S]*?)```/g, '<pre style="background: var(--panel-2); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; border: 1px solid var(--border);"><code style="font-family: monospace; font-size: 14px;">$1</code></pre>')
                      .replace(/## (.*?)(\n|$)/g, '<h2 style="color: var(--fg); margin-top: 24px; margin-bottom: 12px; font-size: 20px; font-weight: 600;">$1</h2>')
                      .replace(/### (.*?)(\n|$)/g, '<h3 style="color: var(--fg); margin-top: 20px; margin-bottom: 8px; font-size: 18px; font-weight: 600;">$1</h3>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--fg); font-weight: 600;">$1</strong>')
                      .replace(/- (.*?)(\n|$)/g, '<li style="margin-left: 20px; margin-bottom: 8px; list-style-type: disc;">$1</li>')
                      .replace(/\n/g, '<br>')
                  }} 
                />
              </div>
            ) : (
              <div style={{ 
                padding: '24px',
                background: 'var(--panel-2)',
                borderRadius: '12px',
                border: '2px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 48, opacity: 0.6 }}>📝</div>
                <div>
                  <p style={{ 
                    margin: 0,
                    marginBottom: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--fg)'
                  }}>
                    No description available
                  </p>
                  <p style={{ 
                    margin: 0,
                    fontSize: 14,
                    color: 'var(--muted)'
                  }}>
                    Generate a detailed description with exercises and learning objectives
                  </p>
                </div>
                <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await fetch('/api/ai/generate-task-content', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        taskTitle: task.title,
                        taskDifficulty: task.difficulty || 'medium',
                        taskCategory: task.category || 'general',
                        taskSkills: task.skills || [],
                        estimatedTime: task.estimatedTime || 30
                      })
                    });
                    
                    if (res.ok) {
                      const data = await res.json();
                      if (data.description) {
                        // Update task description
                        const updateRes = await fetch(`/api/tasks/${task._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ description: data.description })
                        });
                        
                        if (updateRes.ok) {
                          const updated = await updateRes.json();
                          setTask(updated.task);
                          alert('✅ Description and exercises generated!');
                        }
                      }
                    }
                  } catch (err) {
                    console.error('Failed to generate description:', err);
                    alert('Failed to generate description');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                  {loading ? '⏳' : '✨'} {loading ? 'Generating...' : 'Generate Description & Exercises'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* NFT Badge Display (if minted) */}
        {task.nftMinted && task.score && (
          <div className="github-card" style={{ 
            marginBottom: 20, 
            padding: '24px',
            background: `linear-gradient(135deg, ${getBadgeTier(task.score).color}15, ${getBadgeTier(task.score).color}05)`,
            border: `2px solid ${getBadgeTier(task.score).color}40`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ 
                fontSize: 48,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                {getBadgeTier(task.score).emoji}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: 0, 
                  marginBottom: 4,
                  fontSize: 18,
                  fontWeight: 700,
                  color: getBadgeTier(task.score).color
                }}>
                  {getBadgeTier(task.score).tier} Achievement Badge Earned!
                </h3>
                <p style={{ 
                  margin: 0,
                  fontSize: 14,
                  color: 'var(--muted)',
                  marginBottom: 8
                }}>
                  NFT Badge minted on Hedera • Score: {task.score}%
                </p>
                {task.nftMetadataUri && (
                  <a 
                    href={task.nftMetadataUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: getBadgeTier(task.score).color,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    View on Hedera Explorer <FaExternalLinkAlt size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

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
