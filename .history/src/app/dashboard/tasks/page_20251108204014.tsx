"use client";
import { useEffect, useMemo, useState } from 'react';

type Task = { _id: string; title: string; completed?: boolean; dueAt?: string | null };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/tasks', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load tasks');
        const data = await res.json();
        if (!mounted) return;
        setTasks(data.tasks || []);
  } catch (err: unknown) {
    if (!mounted) return;
    // log minimal info for debugging while avoiding noisy stack traces in prod
    console.debug('tasks load failed', err instanceof Error ? err.message : String(err));
    setError('Cannot load tasks. You may be offline.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const remaining = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    setTitle('');
    try {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: name }) });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      setTasks((prev) => [data.task, ...prev]);
    } catch (err: unknown) {
      console.debug('create task failed', err instanceof Error ? err.message : String(err));
      setError('Unable to create task (maybe offline). It will not persist until you are online.');
    }
  }

  async function toggleTask(id: string, completed: boolean) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }) });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setTasks((prev) => prev.map(t => t._id === id ? data.task : t));
    } catch (err: unknown) {
      console.debug('update task failed', err instanceof Error ? err.message : String(err));
      setError('Failed to update task');
    }
  }

  async function deleteTask(id: string) {
    const old = tasks;
    setTasks((prev) => prev.filter(t => t._id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed');
    } catch (err: unknown) {
      // rollback on failure
      setTasks(old);
      console.debug('delete task failed', err instanceof Error ? err.message : String(err));
      setError('Failed to delete task');
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Tasks</h1>
      <p className="muted small mb-4">Remaining: {remaining}</p>

      <form onSubmit={addTask} className="row" style={{ gap: 8, marginBottom: 12 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" aria-label="Task title" />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {loading && <div className="muted small">Loading…</div>}
      {error && <div className="small" style={{ color: '#ff6b6b' }}>{error}</div>}

      <ul style={{ display: 'grid', gap: 10 }}>
        {tasks.map((t) => (
          <li key={t._id} className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={!!t.completed} onChange={(e) => toggleTask(t._id, e.target.checked)} />
              <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
            </label>
            <button className="btn btn-ghost" onClick={() => deleteTask(t._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
