"use client";
import { useEffect, useState } from 'react';

type PlanItem = { title: string; minutes: number; details?: string };

export default function RecommendPage() {
  const [plan, setPlan] = useState<PlanItem[] | null>(null);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPlan() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/recommend', { method: 'POST' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to recommend');
      }
      const data = await res.json() as { plan?: PlanItem[]; source?: string };
      setPlan(data.plan || []);
      setSource(data.source || '');
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPlan(); }, []);

  async function addToTasks(item: PlanItem) {
    try {
      await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: item.title }) });
      await fetch('/api/ai/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'accept_recommendation', payload: { title: item.title } }) });
      alert('Task added.');
    } catch {
      alert('Failed to add task.');
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Personalized Plan</h1>
      {loading && <div className="muted small">Generating…</div>}
      {error && <div className="small" style={{ color: '#ff6b6b' }}>{error}</div>}
      {plan && (
        <div className="grid gap-3">
          {plan.map((p, i) => (
            <div key={i} className="panel">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                <div className="small muted">{p.minutes} min</div>
              </div>
              {p.details && <div className="small muted" style={{ marginTop: 6 }}>{p.details}</div>}
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => addToTasks(p)}>Add to Tasks</button>
              </div>
            </div>
          ))}
          <div className="small muted">Source: {source || 'unknown'}</div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={fetchPlan}>Regenerate</button>
      </div>
    </div>
  );
}
