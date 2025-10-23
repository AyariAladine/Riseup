"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Task = { _id: string; title: string; dueAt?: string; dueDate?: string; createdAt?: string; completed?: boolean; difficulty?: string; description?: string; category?: string; estimatedTime?: number };
type AITask = { id: string; title: string; description: string; difficulty: string; category: string; estimatedTime: number; skills: string[] };
type AIRecommendation = { tasks: AITask[]; tasksPerWeek: number; difficulty: string; adaptiveMessage: string };

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function DashboardCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState<string>("09:00");
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateISO(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [view, setView] = useState<"day" | "week">("week");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  // AI Recommendations state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [selectedTaskDates, setSelectedTaskDates] = useState<{ [key: number]: string }>({});

  async function fetchTasks() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", { credentials: "include" });
      if (!res.ok) {
        let msg = `Failed to load tasks (${res.status})`;
        try { const j = await res.json(); if (j && j.message) msg = String(j.message); } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
  console.log('Client fetchTasks - got tasks:', data.tasks);
  setTasks(data.tasks || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Error");
    } finally {
      setLoading(false);
    }
  }

  // Get AI Recommendations
  async function getAIRecommendations() {
    setAILoading(true);
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get recommendations');
      }
      
      const data = await res.json();
      setAIRecommendations(data);
      setShowAIModal(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Error getting AI recommendations. Make sure the Flask AI service is running on port 5000.');
    } finally {
      setAILoading(false);
    }
  }

  // Schedule AI task to calendar
  async function scheduleAITask(task: AITask, index: number) {
    const dueDate = selectedTaskDates[index];
    if (!dueDate) {
      alert('Please select a due date first');
      return;
    }

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            title: task.title,
            description: task.description,
            difficulty: task.difficulty,
            category: task.category,
            estimatedTime: task.estimatedTime,
            skills: task.skills
          },
          dueDate: `${dueDate}T09:00:00`,
          aiRecommendation: aiRecommendations
        })
      });

      if (!res.ok) {
        throw new Error('Failed to add task to calendar');
      }

      alert('✅ Task added to calendar!');
      fetchTasks(); // Refresh tasks
      
      // Remove this task from the list
      setSelectedTaskDates(prev => {
        const newDates = { ...prev };
        delete newDates[index];
        return newDates;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Error scheduling task');
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // Scroll to current hour on today
  useEffect(() => {
    const isToday = selectedDate === formatDateISO(new Date());
    if (!isToday) return;
    const node = scrollRef.current;
    if (!node) return;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    node.scrollTop = Math.max(0, minutes - 200);
  }, [selectedDate]);

  const selected = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);
  const dayStart = useMemo(() => startOfDay(selected), [selected]);
  const dayEnd = useMemo(() => endOfDay(selected), [selected]);

  const tasksForDay = useMemo(() => {
    return tasks.filter((t) => {
      const dateStr = t.dueAt || t.dueDate || t.createdAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= dayStart && d <= dayEnd;
    });
  }, [tasks, dayStart, dayEnd]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    // Compose dueAt from selected date + chosen time (local)
    const dueAtLocal = `${selectedDate}T${time}:00`;
    await fetch("/api/tasks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), dueAt: dueAtLocal }),
    });
    setTitle("");
    fetchTasks();
  }

  async function toggleComplete(id: string, completed: boolean) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    fetchTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE", credentials: "include" });
    fetchTasks();
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);
  // 1 minute = 1px (1440px tall day); container scrolls
  const DAY_HEIGHT = 1440;

  return (
  <div className="panel calendar-container">
      <div className="calendar-header">
        <h2 className="calendar-title">Calendar</h2>
        
        {/* AI Recommendations Button */}
        <button
          onClick={getAIRecommendations}
          disabled={aiLoading}
          className="btn btn-primary"
          style={{
            background: aiLoading ? '#999' : 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            border: 'none',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: aiLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: 'auto',
            marginRight: '12px'
          }}
        >
          🤖 {aiLoading ? 'Loading...' : 'Get AI Recommendations'}
        </button>
        
        {/* View toggle and navigation controls */}
        <div className="calendar-controls">
          <div className="btn-group" role="group" aria-label="View toggle">
            <button 
              className={`btn ${view === 'day' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setView('day')} 
              type="button"
            >
              Day
            </button>
            <button 
              className={`btn ${view === 'week' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setView('week')} 
              type="button"
            >
              Week
            </button>
          </div>
          
          <div className="calendar-nav">
            <input
              type="date"
              className="input calendar-date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          
          <button 
            className="btn calendar-today-btn" 
            onClick={() => setSelectedDate(formatDateISO(new Date()))}
          >
            Today
          </button>
        </div>
      </div>

  <p className="muted calendar-description">{view === 'day' ? 'Day view — scroll to see hours.' : 'Week view — 7 days with hourly rows.'}</p>

      {view === 'day' && (
        <form onSubmit={createTask} style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: '180px', fontSize: '0.875rem', padding: '6px 8px' }}
            placeholder="New task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ width: '110px', fontSize: '0.875rem', padding: '6px 8px' }}
          />
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '6px 12px', fontSize: '0.875rem' }}>
            {loading ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      {error && (
        <div className="error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {view === 'day' ? (
        <div
          ref={scrollRef}
          style={{
            position: "relative",
            marginTop: 16,
            height: 600,
            overflow: "auto",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--panel)",
          }}
        >
          {/* Grid layer */}
          <div style={{ position: "relative", height: DAY_HEIGHT }}>
            {hours.map((h) => (
              <div key={h} style={{ position: "absolute", top: h * 60, left: 0, right: 0, height: 60 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 50, paddingLeft: 4, color: "var(--muted)", fontSize: '0.75rem' }}>
                  <div style={{ position: "sticky", top: 0 }}>{String(h).padStart(2, "0")}:00</div>
                </div>
                <div style={{ position: "absolute", left: 50, right: 0, top: 0, bottom: 0 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: "1px solid var(--border)" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: 30, borderTop: "1px dashed var(--border)" }} />
                </div>
              </div>
            ))}

            {/* Events layer */}
            <div style={{ position: "absolute", left: 50, right: 4, top: 0 }}>
              {tasksForDay.map((t) => {
                if (!t.dueAt) return null;
                const d = new Date(t.dueAt);
                const minutes = d.getHours() * 60 + d.getMinutes();
                const top = minutes; // 1px per minute
                const height = 40; // fixed height (no duration in model)
                return (
                  <a key={t._id} href={`/dashboard/calendar/task/${t._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card" style={{ position: "absolute", top, left: 0, right: 0, height, padding: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={!!t.completed}
                          onChange={e => { e.stopPropagation(); e.preventDefault(); toggleComplete(t._id, !!t.completed); }}
                          aria-label="Toggle complete"
                          style={{ flexShrink: 0 }}
                        />
                        <div style={{ textDecoration: t.completed ? "line-through" : "none", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <div className="muted small" style={{ fontSize: '0.75rem' }}>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <button className="btn btn-ghost small" onClick={e => { e.stopPropagation(); e.preventDefault(); deleteTask(t._id); }} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Del</button>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // Week view grid with 7 columns and hourly rows
        <div
          ref={scrollRef}
          style={{ position: 'relative', marginTop: 16, height: 600, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)' }}
        >
          {(() => {
            // Determine the week (Sunday -> Saturday) containing selected date
            const current = new Date(selected);
            const weekStart = new Date(current);
            weekStart.setDate(current.getDate() - ((current.getDay() + 7) % 7));
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              return d;
            });

            return (
              <div style={{ position: 'relative', height: DAY_HEIGHT, minWidth: '100%' }}>
                {/* Hour rows across all columns */}
                {hours.map((h) => (
                  <div key={h} style={{ position: 'absolute', top: h * 60, left: 0, right: 0, height: 60 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 50, paddingLeft: 4, color: 'var(--muted)', fontSize: '0.75rem' }}>
                      <div style={{ position: 'sticky', top: 0 }}>{String(h).padStart(2, '0')}:00</div>
                    </div>
                    <div style={{ position: 'absolute', left: 50, right: 0, top: 0, bottom: 0 }}>
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTop: '1px solid var(--border)' }} />
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 30, borderTop: '1px dashed var(--border)' }} />
                    </div>
                  </div>
                ))}

                {/* Day columns */}
                <div style={{ position: 'absolute', left: 50, right: 4, top: 0, bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, minWidth: '600px' }}>
                  {days.map((d) => {
                    const dayKey = formatDateISO(d);
                    const dayTasks = tasks.filter((t) => {
                      const dtStr = t.dueAt || t.dueDate || t.createdAt;
                      if (!dtStr) return false;
                      return formatDateISO(new Date(dtStr)) === dayKey;
                    });
                    return (
                      <div key={dayKey} style={{ position: 'relative', minWidth: 0 }}>
                        <div className="small muted" style={{ position: 'sticky', top: 0, background: 'var(--panel)', padding: '2px 0', zIndex: 1, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {dayTasks.map((t) => {
                          const dt = new Date(t.dueAt || t.dueDate || t.createdAt!);
                          const minutes = dt.getHours() * 60 + dt.getMinutes();
                          const top = minutes;
                          const height = 40;
                          return (
                            <a key={t._id} href={`/dashboard/calendar/task/${t._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div className="card" style={{ position: 'absolute', top, left: 0, right: 0, height, padding: 4, display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.7rem', overflow: 'hidden', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                  <input type="checkbox" checked={!!t.completed} onChange={e => { e.stopPropagation(); e.preventDefault(); toggleComplete(t._id, !!t.completed); }} aria-label="Toggle complete" style={{ flexShrink: 0, transform: 'scale(0.85)' }} />
                                  <div style={{ textDecoration: t.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</div>
                                </div>
                                <div className="muted small" style={{ fontSize: '0.65rem', paddingLeft: '18px' }}>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* AI Recommendations Modal */}
      {showAIModal && aiRecommendations && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAIModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #FFF8E7 0%, #FFE5D9 100%)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowAIModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#8B4513'
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ color: '#8B4513', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                🤖 AI Task Recommendations
              </h2>
              <p style={{ color: '#A0522D', fontSize: '14px' }}>
                {aiRecommendations.adaptiveMessage || 'Here are personalized tasks based on your learning profile.'}
              </p>
              <p style={{ color: '#D2691E', fontSize: '12px', marginTop: '8px' }}>
                Recommended: {aiRecommendations.tasksPerWeek} tasks per week • Difficulty: {aiRecommendations.difficulty}
              </p>
            </div>

            {/* Task List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {aiRecommendations.tasks.map((task, index) => (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '2px solid #FFECD1',
                    boxShadow: '0 2px 8px rgba(139, 69, 19, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ color: '#8B4513', fontSize: '18px', fontWeight: 'bold', flex: 1 }}>
                      {task.title}
                    </h3>
                    <span
                      style={{
                        background:
                          task.difficulty === 'easy'
                            ? '#4CAF50'
                            : task.difficulty === 'medium'
                            ? '#FF9800'
                            : '#F44336',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginLeft: '12px'
                      }}
                    >
                      {task.difficulty}
                    </span>
                  </div>

                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px', lineHeight: '1.5' }}>
                    {task.description}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span style={{ color: '#A0522D', fontSize: '12px' }}>
                      📂 {task.category}
                    </span>
                    <span style={{ color: '#A0522D', fontSize: '12px' }}>
                      ⏱️ {task.estimatedTime} min
                    </span>
                    {task.skills && task.skills.length > 0 && (
                      <span style={{ color: '#A0522D', fontSize: '12px' }}>
                        🎯 {task.skills.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Due Date Selector */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ color: '#8B4513', fontSize: '14px', fontWeight: 'bold' }}>
                      Due Date:
                    </label>
                    <input
                      type="date"
                      value={selectedTaskDates[index] || ''}
                      onChange={(e) =>
                        setSelectedTaskDates((prev) => ({ ...prev, [index]: e.target.value }))
                      }
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '2px solid #FFECD1',
                        fontSize: '14px',
                        flex: 1
                      }}
                    />
                    <button
                      onClick={() => scheduleAITask(task, index)}
                      disabled={!selectedTaskDates[index]}
                      style={{
                        background: selectedTaskDates[index]
                          ? 'linear-gradient(135deg, #8B4513, #D2691E)'
                          : '#ccc',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: selectedTaskDates[index] ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📅 Add to Calendar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}