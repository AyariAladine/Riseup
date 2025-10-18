"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Task = { _id: string; title: string; dueAt?: string; completed?: boolean };

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
      setTasks(data.tasks || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Error");
    } finally {
      setLoading(false);
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
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt);
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
                  <div key={t._id} className="card" style={{ position: "absolute", top, left: 0, right: 0, height, padding: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: '0.875rem' }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={!!t.completed}
                        onChange={() => toggleComplete(t._id, !!t.completed)}
                        aria-label="Toggle complete"
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ textDecoration: t.completed ? "line-through" : "none", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <div className="muted small" style={{ fontSize: '0.75rem' }}>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      <button className="btn btn-ghost small" onClick={() => deleteTask(t._id)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Del</button>
                    </div>
                  </div>
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
                    const dayTasks = tasks.filter((t) => t.dueAt && formatDateISO(new Date(t.dueAt)) === dayKey);
                    return (
                      <div key={dayKey} style={{ position: 'relative', minWidth: 0 }}>
                        <div className="small muted" style={{ position: 'sticky', top: 0, background: 'var(--panel)', padding: '2px 0', zIndex: 1, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {dayTasks.map((t) => {
                          const dt = new Date(t.dueAt!);
                          const minutes = dt.getHours() * 60 + dt.getMinutes();
                          const top = minutes;
                          const height = 40;
                          return (
                            <div key={t._id} className="card" style={{ position: 'absolute', top, left: 0, right: 0, height, padding: 4, display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.7rem', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                <input type="checkbox" checked={!!t.completed} onChange={() => toggleComplete(t._id, !!t.completed)} aria-label="Toggle complete" style={{ flexShrink: 0, transform: 'scale(0.85)' }} />
                                <div style={{ textDecoration: t.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</div>
                              </div>
                              <div className="muted small" style={{ fontSize: '0.65rem', paddingLeft: '18px' }}>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
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
    </div>
  );
}