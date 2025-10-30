"use client";
import { useEffect, useState } from 'react';

type PlanItem = { title: string; minutes: number; details?: string };

export default function RecommendPage() {
  const [plan, setPlan] = useState<PlanItem[] | null>(null);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{score:number, total:number} | null>(null);

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

  async function getQuiz() {
    setQuizLoading(true);
    setShowQuiz(true);
    setQuiz(null); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null);
    try {
      const r = await fetch('/api/ai/quiz', {method:'POST'});
      const data = await r.json();
      setQuiz(data);
    } catch (e) {
      setQuiz({error: 'Failed to load quiz'});
    } finally {
      setQuizLoading(false);
    }
  }

  function handleQuizSelect(qIdx: number, answer: string) {
    setQuizAnswers(prev => ({ ...prev, [qIdx]:answer }));
  }

  async function handleQuizSubmit() {
    if (!quiz?.questions) return;
    // Compute score and feedback locally for now
    let score = 0;
    const total = quiz.questions.length;
    quiz.questions.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.correct) score++;
    });
    setQuizSubmitted(true);
    setQuizScore({score, total});
    // Optionally send to backend for logging/analytics/profile-updating
    try {
      await fetch('/api/ai/quiz/result', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          answers:{...quizAnswers},
          quiz,
          score,
          total,
        })
      });
    } catch {}
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
              <div style={{ marginTop: 8, display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={() => addToTasks(p)}>Add to Tasks</button>
                <button className="btn btn-secondary" onClick={getQuiz}>Take a Quiz</button>
              </div>
            </div>
          ))}
          <div className="small muted">Source: {source || 'unknown'}</div>
        </div>
      )}
      {/* Quiz Modal or Panel */}
      {showQuiz && (
        <div style={{ position:'fixed', left:0, top:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.2)', zIndex:20, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{ background:'#fff', boxShadow:'0 2px 8px #aaa', padding:32, borderRadius:6, minWidth:320, maxWidth:400 }}>
            <div style={{ fontWeight:600, marginBottom:6 }}>Personalized Quiz</div>
            {quizLoading && <div>Loading quiz…</div>}
            {quiz && quiz.questions && (
              <form
                onSubmit={e=>{e.preventDefault(); handleQuizSubmit();}}
                style={{marginBottom:8}}
              >
                <div style={{ fontWeight: 500, marginBottom:8 }}>Topic: {quiz.topic}</div>
                {quiz.questions.map((q:any, idx:number) => (
                  <div key={idx} style={{marginBottom:14}}>
                    <div style={{marginBottom:4}}>{q.text}</div>
                    <ul style={{listStyle:'none',padding:0}}>
                      {q.choices.map((opt:string, j:number) => (
                        <li key={j}>
                          <label style={{display:'flex',alignItems:'center',gap:4}}>
                            <input
                              type="radio"
                              name={`q${idx}`}
                              value={opt}
                              disabled={quizSubmitted}
                              checked={quizAnswers[idx]===opt}
                              onChange={()=>handleQuizSelect(idx,opt)}
                            />
                            <span style={{fontWeight:quizSubmitted && q.correct===opt?'bold':undefined}}>{opt}</span>
                            {quizSubmitted && opt===q.correct && <span style={{color:'#12b886'}}>✔</span>}
                            {quizSubmitted && quizAnswers[idx]===opt && opt!==q.correct && <span style={{color:'#fa5252'}}>✗</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                    {quizSubmitted && <div className="small muted" style={{marginLeft:2}}>{q.explanation}</div>}
                  </div>
                ))}
                {!quizSubmitted && (
                  <button className="btn btn-primary" style={{marginTop:8}} type="submit">Submit Quiz</button>
                )}
                {quizSubmitted && quizScore && (
                  <div style={{marginTop:8}}>Score: {quizScore.score} / {quizScore.total}</div>
                )}
              </form>
            )}
            {quiz && quiz.error && <div style={{ color:'#ff6b6b' }}>{quiz.error}</div>}
            <button className="btn btn-ghost" onClick={()=>setShowQuiz(false)} style={{marginTop:8}}>Close</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={fetchPlan}>Regenerate</button>
      </div>
    </div>
  );
}
