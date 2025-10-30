"use client";
import { useState } from 'react';
import Link from 'next/link';
import { FaRegCalendarAlt, FaRegClock, FaCheckCircle, FaRegLightbulb, FaTimes, FaCheck, FaTimesCircle } from 'react-icons/fa';

type Task = {
  _id: string;
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  dueAt?: string;
  completed?: boolean;
};

export default function TaskDetailClient({ task }: { task: Task }) {
  const [quizModal, setQuizModal] = useState(false);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{score:number, total:number} | null>(null);

  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isCompleted = !!task.completed;
  const difficultyColor = {
    easy: '#10b981',
    medium: '#f59e42',
    hard: '#ef4444',
  }[(task.difficulty || 'medium') as 'easy' | 'medium' | 'hard'];

  async function getQuiz() {
    setQuizModal(true); setQuizLoading(true); setQuiz(null); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null);
    try {
      const resp = await fetch('/api/ai/quiz', {method:'POST'});
      const data = await resp.json();
      setQuiz(data);
    } catch {
      setQuiz({error:'Failed to load quiz'});
    } finally {
      setQuizLoading(false);
    }
  }
  function handleQuizSelect(qIdx: number, answer: string) {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [qIdx]:answer }));
  }
  async function handleQuizSubmit() {
    if (!quiz?.questions) return;
    let score = 0;
    const total = quiz.questions.length;
    quiz.questions.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.correct) score++;
    });
    setQuizSubmitted(true);
    setQuizScore({score, total});
    try {
      await fetch('/api/ai/quiz/result', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          answers:{...quizAnswers}, quiz, score, total
        })
      });
    } catch{}
  }
  const modalBackdrop = {
    position:'fixed', left:0, top:0, width:'100vw', height:'100vh', background:'rgba(10,14,30,0.25)', zIndex:30, display:'flex', alignItems:'center', justifyContent:'center',
  };
  const modalCard = {
    background:'#fff', boxShadow:'0 2px 24px #0607211a', padding:'0 0 18px 0', borderRadius:19, minWidth:430, maxWidth:670, minHeight:190, animation:"modalpop .35s cubic-bezier(.23,1.01,.59,.92)", position:'relative',
    width:'99vw', margin:'0 auto',
  } as const;
  const keyframes = `@keyframes modalpop { from { transform: scale(.85) translateY(36px); opacity:0 } to { transform:scale(1) translateY(0); opacity:1 } }`;

  return (
    <div style={{ maxWidth: 520, margin: '48px auto', padding: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: 18, boxShadow: '0 6px 32px rgba(0,0,0,0.10)', border: '1.5px solid #e0e7ef', overflow: 'hidden', position: 'relative', }}>
      <style>{keyframes}</style>
      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)', color: 'white', padding: '32px 32px 20px 32px', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, boxShadow: '0 2px 12px rgba(99,102,241,0.10)', display: 'flex', alignItems: 'center', gap: 18, }}>
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
            <span style={{ background: difficultyColor, color: 'white', borderRadius: 8, padding: '2px 10px', fontSize: 13, fontWeight: 600, letterSpacing: 0.5, marginLeft: 8, textTransform: 'capitalize', }}>{task.difficulty || 'medium'}</span>
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
          {/* Go to Assist */}
          <Link href={{ pathname: '/dashboard/assistant', query: { task: encodeURIComponent(JSON.stringify(task)) } }} passHref>
            <button className="btn btn-primary" style={{ background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)', color: 'white', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 10, padding: '10px 28px', boxShadow: '0 2px 8px rgba(99,102,241,0.10)', cursor: 'pointer', transition: 'background 0.2s', }}>Go to Assist</button>
          </Link>
          {/* Go to Learn */}
          <Link href={{ pathname: '/learn', query: { task: encodeURIComponent(JSON.stringify(task)) } }} passHref>
            <button className="btn btn-secondary" style={{ background: 'linear-gradient(90deg, #f59e42 0%, #fbbf24 100%)', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 10, padding: '10px 28px', boxShadow: '0 2px 8px rgba(251,191,36,0.10)', cursor: 'pointer', transition: 'background 0.2s', }}>Go to Learn</button>
          </Link>
          {/* Take a Quiz */}
          <button className="btn btn-tertiary" style={{ background: 'linear-gradient(90deg, #06d6a0 0%, #20c997 100%)', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 10, padding: '10px 28px', boxShadow: '0 2px 8px rgba(6,214,160,0.08)', cursor: 'pointer', transition: 'background 0.2s', }} onClick={getQuiz}>Take a Quiz</button>
        </div>
      </div>

      {quizModal && (
        <div style={modalBackdrop as any}>
          <div style={modalCard as any}>
            {/* Close button */}
            <button onClick={()=>setQuizModal(false)} style={{position:'absolute',top:17,right:18, background:'none', border:'none', fontSize:22, color:'#697098', cursor:'pointer', opacity:.9, zIndex:2}} title="Close"><FaTimes/></button>
            {/* Gradient header bar */}
            <div style={{width:'100%', height:38, background:'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)', borderTopLeftRadius:19, borderTopRightRadius:19, position:'relative', display:'flex',alignItems:'center'}}>
              <span style={{paddingLeft:20, color:'#fff', fontWeight:700, fontSize:17,letterSpacing:-0.5}}>Personalized Quiz</span>
              {quiz && quiz.topic && <span style={{marginLeft:16,background:'#fff4',color:'#fafafa',fontSize:13,padding:'2.5px 13px',borderRadius:6,letterSpacing:0.2,fontWeight:500}}>{quiz.topic}</span>}
            </div>
            <div style={{padding:'9px 39px 0 39px'}}>
            {quizLoading && <div style={{margin:'76px auto 16px auto',textAlign:'center'}}>Loading quiz…</div>}
            {quiz && quiz.questions && (
              <form onSubmit={e=>{e.preventDefault(); handleQuizSubmit();}} style={{marginBottom:8}}>
                {quiz.questions.map((q:any, idx:number) => (
                  <div key={idx} style={{marginBottom:25,padding:'22px 0',borderBottom:idx!==quiz.questions.length-1? '1px solid #e1e5eb':'none',position:'relative'}}>
                    <div style={{marginBottom:15,fontWeight:600,color:'#222',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{color:'#868e96',marginRight:9,fontWeight:700,fontSize:15}}>{idx+1}.</span> {q.text}
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
                      {q.choices.map((opt:string, j:number) => {
                        const isSelected = quizAnswers[idx]===opt;
                        const isCorrect = quizSubmitted && q.correct===opt;
                        const isWrong = quizSubmitted && isSelected && opt!==q.correct;
                        return (
                          <button
                            key={j}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() => handleQuizSelect(idx,opt)}
                            style={{
                              display:'flex',alignItems:'center',justifyContent:'center',
                              border:'none',outline:'none',
                              fontSize:16,fontWeight:isCorrect?700:isWrong?600:500,
                              cursor:quizSubmitted?'default':'pointer',
                              width:'100%', minHeight:46, borderRadius:8,
                              boxShadow:isSelected&&!quizSubmitted?'0 0 0 2px #20c99744':'none',
                              margin:'0',
                              background: isSelected&&!quizSubmitted? '#e6fcf5' : isCorrect? '#d3fae4' : isWrong? '#ffe3e3' : '#f5f7fa',
                              color: isCorrect? '#14853b' : isWrong? '#c92a2a': isSelected? '#1b6e6b': '#505167',
                              fontFamily:'inherit',
                              transition:'background 0.12s,color 0.12s',
                              position:'relative',gap:8,
                            }}
                          >
                            <span style={{flex:'1 1 auto',textAlign:'center'}}>{opt}</span>
                            {quizSubmitted && isCorrect && <FaCheck style={{color:'#14853b'}}/>}
                            {quizSubmitted && isWrong && <FaTimesCircle style={{color:'#e64980'}}/>}
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && <div className="small muted" style={{marginLeft:2,marginTop:11,textAlign:'center',color:'#4c5874',fontSize:14}}>{q.explanation}</div>}
                  </div>
                ))}
                {!quizSubmitted && (
                  <button className="btn btn-primary" style={{marginTop:17, width:'100%'}} type="submit">Submit Quiz</button>
                )}
                {quizSubmitted && quizScore && (
                  <div style={{marginTop:16,fontWeight:600,fontSize:18,textAlign:'center',color:quizScore.score===quizScore.total?'#20c997':'#e64980'}}>Score: {quizScore.score} / {quizScore.total}</div>
                )}
              </form>
            )}
            {quiz && quiz.error && <div style={{ color:'#e64980',margin:'76px 0 12px 0',textAlign:'center' }}>{quiz.error}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
