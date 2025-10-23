import { notFound } from 'next/navigation';
import { getTaskById } from '@/lib/task-data';

type Task = {
  _id: string;
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  dueAt?: string | Date;
  completed?: boolean;
};
import Link from 'next/link';
import { FaRegCalendarAlt, FaRegClock, FaCheckCircle, FaRegLightbulb } from 'react-icons/fa';

export default async function TaskDetailPage(props: { params: { id: string } }) {
  const params = await Promise.resolve(props.params);
  const task = await getTaskById(params.id) as Task | null;
  if (!task) return notFound();

  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isCompleted = !!task.completed;
  const difficultyColor = {
    easy: '#10b981',
    medium: '#f59e42',
    hard: '#ef4444',
  }[(task.difficulty || 'medium') as 'easy' | 'medium' | 'hard'];

  return (
    <div style={{
      maxWidth: 520,
      margin: '48px auto',
      padding: 0,
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: 18,
      boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
      border: '1.5px solid #e0e7ef',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
        color: 'white',
        padding: '32px 32px 20px 32px',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        boxShadow: '0 2px 12px rgba(99,102,241,0.10)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}>
        <FaRegLightbulb size={36} style={{ color: '#ffe066', flexShrink: 0 }} />
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -1 }}>{task.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15 }}>
              <FaRegCalendarAlt style={{ opacity: 0.8 }} />
              {dueDate ? dueDate.toLocaleDateString() : 'No due date'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15 }}>
              <FaRegClock style={{ opacity: 0.8 }} />
              {dueDate ? dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
            <span style={{
              background: difficultyColor,
              color: 'white',
              borderRadius: 8,
              padding: '2px 10px',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.5,
              marginLeft: 8,
              textTransform: 'capitalize',
            }}>{task.difficulty || 'medium'}</span>
            {isCompleted && (
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 15, marginLeft: 8 }}>
                <FaCheckCircle /> Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '32px 32px 24px 32px', background: 'white' }}>
        <div style={{ fontSize: 17, color: '#334155', marginBottom: 24, minHeight: 40 }}>
          {task.description || <span style={{ color: '#94a3b8' }}>No description provided for this task.</span>}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
          {/* Send the full task as a JSON string in the query param for focus */}
          <Link
            href={{
              pathname: '/dashboard/assistant',
              query: { task: encodeURIComponent(JSON.stringify(task)) },
            }}
            passHref
          >
            <button className="btn btn-primary" style={{
              background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              borderRadius: 10,
              padding: '10px 28px',
              boxShadow: '0 2px 8px rgba(99,102,241,0.10)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}>Go to Assist</button>
          </Link>
          <Link
            href={{
              pathname: '/learn',
              query: { task: encodeURIComponent(JSON.stringify(task)) },
            }}
            passHref
          >
            <button className="btn btn-secondary" style={{
              background: 'linear-gradient(90deg, #f59e42 0%, #fbbf24 100%)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              borderRadius: 10,
              padding: '10px 28px',
              boxShadow: '0 2px 8px rgba(251,191,36,0.10)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}>Go to Learn</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
