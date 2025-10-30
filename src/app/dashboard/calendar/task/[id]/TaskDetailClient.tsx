"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaRegCalendarAlt, FaRegClock, FaCheckCircle, FaRegLightbulb, FaTimes, FaCheck, FaTimesCircle } from 'react-icons/fa';
import React from 'react';

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
  // Hydration-safe due date formatting
  const [prettyDueDate, setPrettyDueDate] = useState(task.dueAt || null);
  useEffect(() => {
    if (task.dueAt) {
      const d = new Date(task.dueAt);
      setPrettyDueDate(d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [task.dueAt]);
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
  const modalBackdrop: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(10,14,30,0.25)',
    zIndex: 30,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 48
  };

  const modalCard: React.CSSProperties = {
    background: '#fff',
    boxShadow: '0 2px 24px #0607211a',
    borderRadius: 19,
    minWidth: 420,
    maxWidth: 690,
    minHeight: 170,
    position: 'relative',
    width: '99vw',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 18,
    paddingLeft: 0,
  };

  const outerPageCard: React.CSSProperties = {
    maxWidth: 520,
    marginTop: 48,
    marginRight: 'auto',
    marginBottom: 48,
    marginLeft: 'auto',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    borderRadius: 18,
    boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
    border: '1.5px solid #e0e7ef',
    overflow: 'hidden',
    position: 'relative'
  };

  const mainCard: React.CSSProperties = {
    background: 'white',
    borderRadius: 18,
    boxShadow: '0 0 0 transparent',
    paddingTop: 32,
    paddingRight: 32,
    paddingBottom: 24,
    paddingLeft: 32,
    minHeight: 120
  };

  const modalHeader: React.CSSProperties = {
    width: '100%',
    height: 44,
    background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 1px 7px #372fa104',
    paddingLeft: 26,
    paddingRight: 22,
    paddingTop: 0,
    paddingBottom: 0
  };

  return (
    <div style={outerPageCard}>
      {quizModal && (
        <div style={modalBackdrop}>
          <div className="modalCardAnim" style={modalCard}>
            {/* Close button */}
            <button onClick={()=>setQuizModal(false)} style={{position:'absolute',top:17,right:18, background:'none', border:'none', fontSize:22, color:'#697098', cursor:'pointer', opacity:.9, zIndex:2}} title="Close"><FaTimes/></button>
            {/* Modal header: style with explicit keys */}
            <div style={modalHeader}>
              <span style={{color:'#fff', fontWeight:700, fontSize:19,letterSpacing:-0.5, flex:1}}>Personalized Quiz</span>
              {quiz && quiz.topic && <span style={{background:'#fff3',color:'#fafafa',fontSize:13,padding:'2.5px 13px',borderRadius:7,letterSpacing:0.22,fontWeight:500, marginLeft:16}}>{quiz.topic}</span>}
            </div>
            <div style={{paddingTop:22, paddingRight:39, paddingBottom:6, paddingLeft:39, minWidth:340, maxWidth:670}}>
            {quizLoading && <div style={{margin:'76px auto 16px auto',textAlign:'center'}}>Loading quiz…</div>}
            {quiz && quiz.questions && (
              <form onSubmit={e=>{e.preventDefault(); handleQuizSubmit();}} style={{marginBottom:8}}>
                {quiz.questions.map((q:any, idx:number) => (
                  <div key={idx} style={{marginBottom:32,padding:'10px 0',borderBottom:idx!==quiz.questions.length-1? '1px solid #e1e5eb':'none',position:'relative'}}>
                    <div style={{marginBottom:15,fontWeight:600,color:'#23263b',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center', letterSpacing:'-0.4px'}}>
                      <span style={{color:'#868e96',marginRight:9,fontWeight:700,fontSize:16}}>{idx+1}.</span> {q.text}
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:14, alignItems:'stretch', width:'100%',maxWidth:420,margin:'0 auto'}}>
                      {q.choices.map((opt:string, j:number) => {
                        const isSelected = quizAnswers[idx]===opt;
                        const isCorrect = quizSubmitted && q.correct===opt;
                        const isWrong = quizSubmitted && isSelected && opt!==q.correct;
                        // Colored answer bars, big, clickable
                        let bg = '#f5f7fa', textColor='#556', fontWeight=500;
                        if (!quizSubmitted && isSelected) {bg='#e6fcf5'; textColor='#19988e'; fontWeight=700;}
                        if (quizSubmitted && isCorrect) {bg='#d3fae4'; textColor='#14853b'; fontWeight=700;}
                        if (quizSubmitted && isWrong) {bg='#ffe3e3'; textColor='#ce3444'; fontWeight=700;}
                        return (
                          <button
                            key={j}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() => handleQuizSelect(idx,opt)}
                            style={{
                              display:'flex',alignItems:'center',justifyContent:'center',
                              border:'none',outline:'none', fontSize:17, fontWeight,
                              cursor:quizSubmitted?'default':'pointer',
                              width:'100%', minHeight:50, borderRadius:11,
                              boxShadow:isSelected&&!quizSubmitted?'0 0 0 2px #20c99744':'0 2px 11px #23263010',
                              margin:'0',background:bg, color:textColor, fontFamily:'inherit',
                              transition:'background 0.14s,color 0.13s', position:'relative',gap:10,
                              textAlign:'center', padding:'0', outlineOffset:0
                            }}
                          >
                            <span style={{flex:'1 1 auto',textAlign:'center',fontSize:17}}>{opt}</span>
                            {quizSubmitted && isCorrect && <FaCheck style={{color:'#22b573',fontSize:22,marginLeft:8}}/>}
                            {quizSubmitted && isWrong && <FaTimesCircle style={{color:'#dd3d3d',fontSize:22,marginLeft:8}}/>}
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && (
                      <div className="small muted" style={{marginLeft:2,marginTop:13,textAlign:'center',color:'#426',fontSize:14,paddingBottom:0,fontWeight:500}}>{q.explanation}</div>
                    )}
                  </div>
                ))}
                {!quizSubmitted && (
                  <button className="btn btn-primary" style={{marginTop:17, width:'100%',fontSize:17,borderRadius:7,minHeight:48}} type="submit">Submit Quiz</button>
                )}
                {quizSubmitted && quizScore && (
                  <div style={{marginTop:23,fontWeight:700,fontSize:21,textAlign:'center',color:quizScore.score===quizScore.total?'#14b88f':'#e64980'}}>
                    Score: {quizScore.score} / {quizScore.total}
                  </div>
                )}
              </form>
            )}
            {quiz && quiz.error && <div style={{ color:'#e64980',margin:'76px 0 12px 0',textAlign:'center' }}>{quiz.error}</div>}
            </div>
          </div>
        </div>
      )}
      {/* MAIN TASK CARD—EXPLICIT KEYS STYLE */}
      <div style={mainCard}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)', color: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: '26px 32px 12px 32px', margin:'-32px -32px 18px -32px', display: 'flex', alignItems: 'center', gap:18, flexWrap:"wrap" }}>
          <FaRegLightbulb size={34} style={{ color: '#ffe066', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -1 }}>{task.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop:8 }}>
              <span style={{display:'flex',alignItems:'center',gap:4,fontSize:15}}>
                <FaRegCalendarAlt style={{ opacity: 0.8 }} />
                {prettyDueDate || 'No due date'}
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
        {/* Description */}
        <div style={{ fontSize: 17, color: '#334155', marginBottom: 24, minHeight: 40 }}>
          {task.description || <span style={{ color: '#94a3b8' }}>No description provided for this task.</span>}
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
          <Link href={{ pathname: '/dashboard/assistant', query: { task: encodeURIComponent(JSON.stringify(task)) } }} passHref>
            <button className="btn btn-primary" style={{ background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)', color: 'white', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 10, padding: '10px 28px', boxShadow: '0 2px 8px rgba(99,102,241,0.10)', cursor: 'pointer', transition: 'background 0.2s', }}>Go to Assist</button>
          </Link>
          <Link href={{ pathname: '/learn', query: { task: encodeURIComponent(JSON.stringify(task)) } }} passHref>
            <button className="btn btn-secondary" style={{ background: 'linear-gradient(90deg, #f59e42 0%, #fbbf24 100%)', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 10, padding: '10px 28px', boxShadow: '0 2px 8px rgba(251,191,36,0.10)', cursor: 'pointer', transition: 'background 0.2s', }}>Go to Learn</button>
          </Link>
          <button className="btn btn-tertiary" style={{ background: 'linear-gradient(90deg, #06d6a0 0%, #20c997 100%)', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 10, padding: '10px 28px', boxShadow: '0 2px 8px rgba(6,214,160,0.08)', cursor: 'pointer', transition: 'background 0.2s', }} onClick={getQuiz}>Take a Quiz</button>
        </div>
      </div>
    </div>
  );
}
