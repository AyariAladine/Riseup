"use client";
import { useEffect, useState } from 'react';
import { showNotification } from "@/components/NotificationProvider";

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
      // Generate AI content for the task first
      let aiDescription = '';
      try {
        const contentRes = await fetch('/api/ai/generate-task-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            taskTitle: item.title,
            taskDifficulty: item.details || 'medium',
            taskCategory: 'general',
            taskSkills: [],
            estimatedTime: item.minutes || 30
          })
        });

        if (contentRes.ok) {
          const contentData = await contentRes.json();
          if (contentData.description) {
            aiDescription = contentData.description;
          }
        }
      } catch (contentErr) {
        console.warn('Failed to generate AI content, using fallback:', contentErr);
      }

      // Create task with AI-generated description
      const taskRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: item.title,
          description: aiDescription || `Recommended task: ${item.title} (${item.minutes} minutes)`
        })
      });

      if (!taskRes.ok) {
        throw new Error('Failed to create task');
      }

      const taskData = await taskRes.json();
      const createdTask = taskData.task;

      // Track interaction: user accepted this recommendation
      try {
        await fetch('/api/ai/update-behavior', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            taskId: createdTask._id || createdTask.id,
            taskTitle: item.title,
            taskDifficulty: item.details || 'medium',
            taskCategory: 'general',
            taskSkills: [],
            viewed: true,
            started: false,
            completed: false
          })
        });
      } catch (trackErr) {
        console.warn('Failed to track recommendation acceptance:', trackErr);
      }

      showNotification(
        'Task added with AI-generated content!',
        'success',
        'Task Added'
      );
    } catch (err) {
      console.error('Failed to add task:', err);
      showNotification(
        'Failed to add task. Please try again.',
        'error',
        'Error'
      );
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
