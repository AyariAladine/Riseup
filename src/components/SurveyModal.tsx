"use client";

import { useEffect, useState } from 'react';

type SurveyData = {
  age: number | null;
  yearsOfCoding: number | null;
  codingExperience: string;
  projectsCompleted: number | null;
  willingToLearn: string;
  languagesToLearn: string[];
  primaryLanguageInterest: string;
  activityLevel: string;
  hoursPerWeek: number | null;
  commitmentLevel: string;
};

const PROGRAMMING_LANGUAGES = [
  'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust',
  'Swift', 'Kotlin', 'TypeScript', 'PHP', 'Dart', 'Scala', 'R'
];

interface SurveyModalProps {
  onComplete: (profile?: any) => void;
  onSkip: () => void;
}

export default function SurveyModal({ onComplete, onSkip }: SurveyModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [data, setData] = useState<SurveyData>({
    age: null,
    yearsOfCoding: null,
    codingExperience: '',
    projectsCompleted: null,
    willingToLearn: '',
    languagesToLearn: [],
    primaryLanguageInterest: '',
    activityLevel: '',
    hoursPerWeek: null,
    commitmentLevel: ''
  });

  const totalSteps = 10;

  const handleNext = () => {
    setSlideDirection('forward');
    setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
  };
  
  const handleBack = () => {
    setSlideDirection('backward');
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.age !== null && data.age > 0;
      case 1: return data.yearsOfCoding !== null && data.yearsOfCoding >= 0;
      case 2: return data.codingExperience !== '';
      case 3: return data.projectsCompleted !== null && data.projectsCompleted >= 0;
      case 4: return data.willingToLearn !== '';
      case 5: return data.languagesToLearn.length > 0;
      case 6: return data.primaryLanguageInterest !== '';
      case 7: return data.activityLevel !== '';
      case 8: return data.hoursPerWeek !== null && data.hoursPerWeek >= 0;
      case 9: return data.commitmentLevel !== '';
      default: return false;
    }
  };

  const toggleLanguage = (lang: string) => {
    setData(prev => ({
      ...prev,
      languagesToLearn: prev.languagesToLearn.includes(lang)
        ? prev.languagesToLearn.filter(l => l !== lang)
        : [...prev.languagesToLearn, lang]
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      const responseData = await res.json().catch(() => null);
      
      if (res.ok) {
        onComplete(responseData?.profile || null);
      } else {
        const errorMsg = responseData?.error || 'Failed to save survey';
        console.error('Onboarding error response:', responseData);
        alert(`❌ ${errorMsg}\n\nMake sure you are logged in and try again.`);
      }
    } catch (err) {
      console.error('Onboarding network error:', err);
      alert('❌ Network error: Could not reach the server.\n\nMake sure you are logged in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);

    const styleId = 'survey-modal-styles-v2';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.innerHTML = `
        .survey-modal-wrapper * {
          box-sizing: border-box;
        }
        
        @keyframes surveyFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes surveyScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes surveySlideRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes surveySlideLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes surveyFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes surveyShimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        .survey-modal-wrapper {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: surveyFadeIn 0.3s ease-out;
        }
        
        .survey-backdrop {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(236, 72, 153, 0.4), rgba(59, 130, 246, 0.4));
          backdrop-filter: blur(8px);
        }
        
        .survey-modal-container {
          position: relative;
          width: 100%;
          max-width: 48rem;
          background: white;
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          animation: surveyScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .survey-header {
          position: relative;
          background: linear-gradient(90deg, #a855f7, #ec4899, #3b82f6);
          padding: 1.5rem;
        }
        
        .survey-icon-container {
          width: 4rem;
          height: 4rem;
          background: white;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: surveyFloat 3s ease-in-out infinite;
        }
        
        .survey-progress-bg {
          height: 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          overflow: hidden;
          backdrop-filter: blur(4px);
        }
        
        .survey-progress-fill {
          height: 100%;
          border-radius: 9999px;
          background: linear-gradient(90deg, #f59e0b, #ef4444, #ec4899, #8b5cf6, #3b82f6);
          background-size: 200% 100%;
          animation: surveyShimmer 3s linear infinite;
          transition: width 0.5s ease-out;
        }
        
        .survey-content {
          padding: 2rem;
          min-height: 320px;
          background: linear-gradient(135deg, #f9fafb, #faf5ff);
        }
        
        .survey-step-forward {
          animation: surveySlideRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .survey-step-back {
          animation: surveySlideLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .survey-input {
          width: 100%;
          padding: 1rem;
          font-size: 1.125rem;
          border-radius: 1rem;
          border: 2px solid #e5e7eb;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          color: #1f2937;
        }
        
        .survey-input:focus {
          outline: none;
          border-color: #a855f7;
          transform: scale(1.01);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        .survey-option-btn {
          padding: 1.5rem;
          border-radius: 1rem;
          border: 2px solid #e5e7eb;
          background: white;
          font-weight: 600;
          font-size: 1.125rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          color: #1f2937;
        }
        
        .survey-option-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        }
        
        .survey-option-btn.selected {
          border-color: transparent;
          color: white;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        
        .survey-lang-chip {
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 2px solid #e5e7eb;
          background: white;
          color: #374151;
        }
        
        .survey-lang-chip:hover {
          transform: scale(1.08);
        }
        
        .survey-lang-chip.selected {
          background: linear-gradient(90deg, #a855f7, #ec4899);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        }
        
        .survey-footer {
          padding: 1.5rem;
          background: white;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .survey-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .survey-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        }
        
        .survey-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .survey-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .survey-btn-gray {
          background: #f3f4f6;
          color: #374151;
        }
        
        .survey-btn-primary {
          background: linear-gradient(90deg, #a855f7, #ec4899);
          color: white;
        }
        
        .survey-btn-success {
          background: linear-gradient(90deg, #10b981, #059669);
          color: white;
        }
      `;
      document.head.appendChild(s);
    }

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onSkip]);

  const renderStepContent = () => {
    const stepClass = slideDirection === 'forward' ? 'survey-step-forward' : 'survey-step-back';
    
    switch (currentStep) {
      case 0:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              🎂 How old are you?
            </label>
            <input 
              type="number" 
              value={data.age ?? ''} 
              onChange={e => setData({ ...data, age: parseInt(e.target.value) || null })}
              className="survey-input"
              placeholder="Enter your age"
              autoFocus
              style={{ borderColor: '#c084fc' }}
            />
          </div>
        );
      
      case 1:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              💻 Years of coding experience?
            </label>
            <input 
              type="number" 
              step="0.5"
              value={data.yearsOfCoding ?? ''} 
              onChange={e => setData({ ...data, yearsOfCoding: parseFloat(e.target.value) || null })}
              className="survey-input"
              placeholder="0 if you're just starting"
              autoFocus
              style={{ borderColor: '#60a5fa' }}
            />
          </div>
        );
      
      case 2:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              🚀 What's your experience level?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {[
                { value: 'new', label: 'Beginner', emoji: '🌱', gradient: 'linear-gradient(135deg, #34d399, #10b981)' },
                { value: 'intermediate', label: 'Intermediate', emoji: '🌿', gradient: 'linear-gradient(135deg, #60a5fa, #06b6d4)' },
                { value: 'expert', label: 'Expert', emoji: '🌳', gradient: 'linear-gradient(135deg, #c084fc, #ec4899)' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setData({ ...data, codingExperience: option.value })}
                  className={`survey-option-btn ${data.codingExperience === option.value ? 'selected' : ''}`}
                  style={data.codingExperience === option.value ? { background: option.gradient } : {}}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{option.emoji}</div>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              📦 Projects completed?
            </label>
            <input 
              type="number" 
              value={data.projectsCompleted ?? ''} 
              onChange={e => setData({ ...data, projectsCompleted: parseInt(e.target.value) || null })}
              className="survey-input"
              placeholder="Approximate number"
              autoFocus
              style={{ borderColor: '#f472b6' }}
            />
          </div>
        );
      
      case 4:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              🎯 Willing to learn new things?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { value: 'yes', label: 'Absolutely!', emoji: '🔥', gradient: 'linear-gradient(135deg, #fb923c, #ef4444)' },
                { value: 'no', label: 'Focus on what I know', emoji: '🎓', gradient: 'linear-gradient(135deg, #818cf8, #a855f7)' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setData({ ...data, willingToLearn: option.value })}
                  className={`survey-option-btn ${data.willingToLearn === option.value ? 'selected' : ''}`}
                  style={data.willingToLearn === option.value ? { background: option.gradient } : {}}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{option.emoji}</div>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              🌐 Languages you want to learn? (Select multiple)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {PROGRAMMING_LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`survey-lang-chip ${data.languagesToLearn.includes(lang) ? 'selected' : ''}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 6:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              ⭐ Primary language interest?
            </label>
            <select
              value={data.primaryLanguageInterest}
              onChange={e => setData({ ...data, primaryLanguageInterest: e.target.value })}
              className="survey-input"
              style={{ borderColor: '#22d3ee' }}
            >
              <option value="">Select a language</option>
              {PROGRAMMING_LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        );
      
      case 7:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              ⚡ Your activity level?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {[
                { value: 'casual', label: 'Casual', emoji: '🚶', gradient: 'linear-gradient(135deg, #2dd4bf, #06b6d4)' },
                { value: 'regular', label: 'Regular', emoji: '🏃', gradient: 'linear-gradient(135deg, #60a5fa, #6366f1)' },
                { value: 'intense', label: 'Intense', emoji: '🏋️', gradient: 'linear-gradient(135deg, #f87171, #f472b6)' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setData({ ...data, activityLevel: option.value })}
                  className={`survey-option-btn ${data.activityLevel === option.value ? 'selected' : ''}`}
                  style={data.activityLevel === option.value ? { background: option.gradient } : {}}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{option.emoji}</div>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 8:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              ⏰ Hours per week to dedicate?
            </label>
            <input 
              type="number" 
              value={data.hoursPerWeek ?? ''} 
              onChange={e => setData({ ...data, hoursPerWeek: parseInt(e.target.value) || null })}
              className="survey-input"
              placeholder="Hours per week"
              autoFocus
              style={{ borderColor: '#fbbf24' }}
            />
          </div>
        );
      
      case 9:
        return (
          <div key={currentStep} className={stepClass}>
            <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              💪 Your commitment level?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {[
                { value: 'flexible', label: 'Flexible', emoji: '🌊', gradient: 'linear-gradient(135deg, #22d3ee, #3b82f6)' },
                { value: 'committed', label: 'Committed', emoji: '🎯', gradient: 'linear-gradient(135deg, #34d399, #10b981)' },
                { value: 'dedicated', label: 'Fully Dedicated', emoji: '🔥', gradient: 'linear-gradient(135deg, #fb923c, #ef4444)' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setData({ ...data, commitmentLevel: option.value })}
                  className={`survey-option-btn ${data.commitmentLevel === option.value ? 'selected' : ''}`}
                  style={data.commitmentLevel === option.value ? { background: option.gradient } : {}}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{option.emoji}</div>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="survey-modal-wrapper">
      <div className="survey-backdrop" onClick={onSkip} />
      
      <div className="survey-modal-container">
        {/* Header */}
        <div className="survey-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="survey-icon-container">
                <span style={{ fontSize: '2.5rem' }}>🚀</span>
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Quick Survey</h2>
                <p style={{ color: '#e9d5ff', margin: '0.25rem 0 0 0' }}>Help us personalize your experience</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'white', marginBottom: '0.5rem' }}>
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
            </div>
            <div className="survey-progress-bg">
              <div className="survey-progress-fill" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="survey-content">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="survey-footer">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="survey-btn survey-btn-gray"
          >
            ← Back
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onSkip} className="survey-btn survey-btn-gray">
              Skip
            </button>
            {currentStep < totalSteps - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="survey-btn survey-btn-primary"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="survey-btn survey-btn-success"
              >
                {isSubmitting ? '⏳ Saving...' : '✓ Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}