"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaBrain } from 'react-icons/fa';

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
};

type Quiz = {
  title: string;
  description: string;
  difficulty: string;
  questions: QuizQuestion[];
};

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchQuiz();
  }, []);

  async function fetchQuiz() {
    setLoading(true);
    setError('');
    
    try {
      const taskParam = searchParams?.get('task');
      const task = taskParam ? JSON.parse(decodeURIComponent(taskParam)) : null;

      console.log('Fetching quiz with task:', task);

      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskContext: task })
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Quiz API error:', data);
        throw new Error(data.error || 'Failed to generate quiz');
      }

      const data = await res.json();
      console.log('Received quiz data:', data);
      
      if (!data.quiz) {
        console.error('No quiz in response:', data);
        throw new Error('Invalid quiz data received');
      }
      
      setQuiz(data.quiz);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('fetchQuiz error:', e);
      setError(msg || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAnswer(answerIndex: number) {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  }

  function handleNext() {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      quiz?.questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctAnswer) {
          correctCount++;
        }
      });
      setScore(correctCount);
      setShowResults(true);
      
      // Submit results to API
      submitQuizResults(correctCount);
    }
  }

  function handlePrevious() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  async function submitQuizResults(correctCount: number) {
    try {
      await fetch('/api/ai/quiz/result', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz?.title,
          score: correctCount,
          totalQuestions: quiz?.questions.length,
          answers: selectedAnswers
        })
      });
    } catch (e) {
      console.error('Failed to submit quiz results:', e);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        gap: '16px'
      }}>
        <FaSpinner size={48} className="animate-spin" style={{ color: '#ec4899' }} />
        <p style={{ fontSize: '18px', color: '#64748b' }}>Generating personalized quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '48px auto',
        padding: '32px',
        background: '#fee',
        borderRadius: '12px',
        border: '2px solid #fcc'
      }}>
        <h2 style={{ color: '#c00', marginBottom: '16px' }}>Error</h2>
        <p style={{ color: '#800' }}>{error}</p>
        <button 
          onClick={() => router.back()}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: '#ec4899',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p>No quiz available</p>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{
        maxWidth: '700px',
        margin: '48px auto',
        padding: '0',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '18px',
        boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
        border: '1.5px solid #e0e7ef',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: passed 
            ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
            : 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
          color: 'white',
          padding: '32px',
          textAlign: 'center'
        }}>
          {passed ? (
            <FaCheckCircle size={64} style={{ marginBottom: '16px' }} />
          ) : (
            <FaTimesCircle size={64} style={{ marginBottom: '16px' }} />
          )}
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>
            {passed ? '🎉 Great Job!' : '📚 Keep Learning!'}
          </h1>
          <p style={{ fontSize: '18px', marginTop: '8px', opacity: 0.9 }}>
            You scored {score} out of {quiz.questions.length}
          </p>
          <div style={{
            fontSize: '48px',
            fontWeight: 700,
            marginTop: '16px'
          }}>
            {percentage}%
          </div>
        </div>

        {/* Results Details */}
        <div style={{ padding: '32px', background: 'white' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#334155' }}>
            Review Your Answers
          </h2>
          {quiz.questions.map((q, idx) => {
            const userAnswer = selectedAnswers[idx];
            const isCorrect = userAnswer === q.correctAnswer;
            
            return (
              <div key={idx} style={{
                marginBottom: '24px',
                padding: '20px',
                background: isCorrect ? '#f0fdf4' : '#fef2f2',
                borderRadius: '12px',
                border: `2px solid ${isCorrect ? '#86efac' : '#fca5a5'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  {isCorrect ? (
                    <FaCheckCircle size={24} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <FaTimesCircle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#334155' }}>
                      {idx + 1}. {q.question}
                    </h3>
                    <p style={{ fontSize: '14px', color: isCorrect ? '#15803d' : '#991b1b', marginBottom: '8px' }}>
                      <strong>Your answer:</strong> {q.options[userAnswer]}
                    </p>
                    {!isCorrect && (
                      <p style={{ fontSize: '14px', color: '#15803d' }}>
                        <strong>Correct answer:</strong> {q.options[q.correctAnswer]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button
              onClick={() => {
                setShowResults(false);
                setCurrentQuestion(0);
                setSelectedAnswers([]);
                setScore(0);
                fetchQuiz();
              }}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: 'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(236,72,153,0.10)'
              }}
            >
              Try Another Quiz
            </button>
            <button
              onClick={() => router.push('/dashboard/tasks')}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99,102,241,0.10)'
              }}
            >
              Back to Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div style={{
      maxWidth: '700px',
      margin: '48px auto',
      padding: '0',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '18px',
      boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
      border: '1.5px solid #e0e7ef',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)',
        color: 'white',
        padding: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <FaBrain size={36} />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>{quiz.title}</h1>
            <p style={{ fontSize: '16px', margin: '4px 0 0 0', opacity: 0.9 }}>
              {quiz.description}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '20px',
          height: '8px',
          overflow: 'hidden',
          marginTop: '16px'
        }}>
          <div style={{
            background: 'white',
            height: '100%',
            width: `${progress}%`,
            transition: 'width 0.3s ease',
            borderRadius: '20px'
          }} />
        </div>
        <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
          Question {currentQuestion + 1} of {quiz.questions.length}
        </p>
      </div>

      {/* Question */}
      <div style={{ padding: '32px', background: 'white' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '24px', color: '#334155', lineHeight: 1.5 }}>
          {currentQ.question}
        </h2>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQuestion] === idx;
            
            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                style={{
                  padding: '16px 20px',
                  background: isSelected 
                    ? 'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)'
                    : 'white',
                  color: isSelected ? 'white' : '#334155',
                  border: `2px solid ${isSelected ? '#ec4899' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: isSelected ? 600 : 400,
                  boxShadow: isSelected ? '0 4px 12px rgba(236,72,153,0.10)' : 'none'
                }}
              >
                <span style={{ marginRight: '12px', fontWeight: 700 }}>
                  {String.fromCharCode(65 + idx)}.
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: currentQuestion === 0 ? '#e2e8f0' : 'white',
              color: currentQuestion === 0 ? '#94a3b8' : '#334155',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            ← Previous
          </button>
          <button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion] === undefined}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: selectedAnswers[currentQuestion] !== undefined
                ? 'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)'
                : '#e2e8f0',
              color: selectedAnswers[currentQuestion] !== undefined ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: selectedAnswers[currentQuestion] !== undefined ? 'pointer' : 'not-allowed',
              boxShadow: selectedAnswers[currentQuestion] !== undefined 
                ? '0 2px 8px rgba(236,72,153,0.10)' 
                : 'none'
            }}
          >
            {currentQuestion === quiz.questions.length - 1 ? 'Finish Quiz →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrap with Suspense boundary for useSearchParams
export default function QuizPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <FaSpinner className="animate-spin" size={48} color="white" />
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
