"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type OnboardingData = {
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

interface OnboardingModalProps {
  onComplete: (profile?: any) => void;
  onSkip: () => void;
}

export default function OnboardingModal({ onComplete, onSkip }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
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
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const saved = await response.json().catch(() => null);
        onComplete(saved?.profile || null);
      } else {
        alert('Failed to save your profile. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div 
      className="fixed inset-0 animate-fade-in overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #FFF8E7 0%, #FFE5D9 30%, #FFF0E1 60%, #FFECD1 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 20s ease infinite',
        zIndex: 9999
      }}
    >
      {/* Floating soft shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl animate-float-slow"
          style={{ 
            background: 'radial-gradient(circle, rgba(255, 220, 180, 0.6) 0%, transparent 70%)',
            top: '10%',
            left: '15%'
          }}
        />
        
        <div 
          className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl animate-float-slower"
          style={{ 
            background: 'radial-gradient(circle, rgba(255, 200, 150, 0.5) 0%, transparent 70%)',
            top: '60%',
            right: '20%'
          }}
        />
        <div 
          className="absolute w-64 h-64 rounded-full opacity-20 blur-3xl animate-float-slow"
          style={{ 
            background: 'radial-gradient(circle, rgba(255, 230, 200, 0.5) 0%, transparent 70%)',
            bottom: '20%',
            left: '50%'
          }}
        />
      </div>
      
      <div className="relative w-full h-screen flex flex-col animate-scale-in p-8 md:p-12 overflow-y-auto">
        {/* Brand Icon - Top Left */}
        <div className="absolute top-6 left-6 z-20">
          <div 
            className="flex items-center gap-3 px-6 py-3 rounded-full"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 8px 32px rgba(210, 105, 30, 0.15)'
            }}
          >
            <div className="text-3xl">🚀</div>
            <span className="font-black text-2xl" style={{ color: '#D2691E' }}>RiseUP</span>
          </div>
        </div>

        {/* Skip button - Top Right */}
        <button
          onClick={onSkip}
          className="absolute top-6 right-6 px-8 py-4 rounded-full transition-all z-20 hover:scale-105 font-bold text-lg shadow-lg"
          style={{ 
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#D2691E',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(210, 105, 30, 0.15)'
          }}
          title="Skip for now"
        >
          ⏭️ Skip for now
        </button>

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full py-8">

          {/* Progress indicator */}
          <div className="mb-10 text-center">
            <div className="text-3xl font-semibold mb-4" style={{ color: '#8B4513' }}>
              Question {currentStep + 1} of {totalSteps}
            </div>
            <div className="flex justify-center gap-3 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="transition-all duration-500"
                  style={{
                    width: i === currentStep ? '56px' : '14px',
                    height: '14px',
                    borderRadius: '999px',
                    background: i <= currentStep 
                      ? '#D2691E' 
                      : 'rgba(210, 105, 30, 0.2)',
                    boxShadow: i === currentStep ? '0 4px 24px rgba(210, 105, 30, 0.4)' : 'none'
                  }}
                />
              ))}
            </div>
            <div className="text-2xl font-medium" style={{ color: '#A0522D' }}>
              {Math.round(progress)}% Complete
            </div>
          </div>

          {/* Question Card */}
          <div 
            className="bg-white rounded-3xl p-12 md:p-20 shadow-2xl mb-10 animate-slide-in w-full"
            style={{
              minHeight: '450px',
              maxWidth: '900px',
              boxShadow: '0 20px 60px rgba(139, 69, 19, 0.15)',
              border: '2px solid rgba(210, 105, 30, 0.1)'
            }}
          >

            {/* Step 0: Age */}
            {currentStep === 0 && (
              <div className="text-center">
                <div className="text-8xl mb-10">👋</div>
                <h2 className="text-6xl font-bold mb-6" style={{ color: '#D2691E' }}>
                  Welcome to RiseUP!
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  Let's personalize your learning journey
                </p>
                <p className="text-4xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  How old are you?
                </p>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={data.age || ''}
                  onChange={(e) => setData({ ...data, age: parseInt(e.target.value) || null })}
                  className="w-full px-10 py-10 rounded-3xl text-6xl text-center font-bold transition-all focus:scale-105"
                  style={{
                    background: '#FFF8F0',
                    border: '4px solid #FFE4C4',
                    color: '#D2691E',
                    outline: 'none'
                  }}
                  placeholder="25"
                  autoFocus
                />
              </div>
            )}

            {/* Step 1: Years of Coding */}
            {currentStep === 1 && (
              <div className="text-center">
                <div className="text-8xl mb-10">💻</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Coding Experience
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  How many years have you been coding?
                </p>
                <div className="space-y-6">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={data.yearsOfCoding || ''}
                    onChange={(e) => setData({ ...data, yearsOfCoding: parseFloat(e.target.value) || null })}
                    className="w-full px-10 py-10 rounded-3xl text-6xl text-center font-bold transition-all focus:scale-105"
                    style={{
                      background: '#FFF8F0',
                      border: '4px solid #FFE4C4',
                      color: '#D2691E',
                      outline: 'none'
                    }}
                    placeholder="2.5"
                    autoFocus
                  />
                  <p className="text-2xl" style={{ color: '#A0522D' }}>
                    💡 Enter 0 if you're just starting - everyone starts somewhere! 🌱
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Experience Level */}
            {currentStep === 2 && (
              <div className="text-center">
                <div className="text-8xl mb-10">📊</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Experience Level
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  How would you describe your coding skills?
                </p>
                <div className="space-y-6">
                  {[
                    { value: 'new', label: '🌱 Beginner', desc: 'Just starting my coding journey' },
                    { value: 'intermediate', label: '🚀 Intermediate', desc: 'Comfortable with basics, learning more' },
                    { value: 'expert', label: '⭐ Advanced', desc: 'Experienced with multiple projects' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setData({ ...data, codingExperience: option.value })}
                      className={`w-full p-12 rounded-3xl transition-all text-left hover:scale-105 ${
                        data.codingExperience === option.value ? 'scale-105' : ''
                      }`}
                      style={{
                        background: data.codingExperience === option.value ? '#FFF0E1' : '#FFF8F0',
                        border: data.codingExperience === option.value ? '4px solid #D2691E' : '4px solid #FFE4C4',
                        boxShadow: data.codingExperience === option.value ? '0 10px 40px rgba(210, 105, 30, 0.3)' : '0 4px 12px rgba(210, 105, 30, 0.1)'
                      }}
                    >
                      <div className="font-bold text-4xl mb-4" style={{ color: '#D2691E' }}>{option.label}</div>
                      <div className="text-2xl" style={{ color: '#A0522D' }}>{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Projects Completed */}
            {currentStep === 3 && (
              <div className="text-center">
                <div className="text-8xl mb-10">🎯</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Your Projects
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  How many coding projects have you completed?
                </p>
                <div className="space-y-6">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={data.projectsCompleted || ''}
                    onChange={(e) => setData({ ...data, projectsCompleted: parseInt(e.target.value) || null })}
                    className="w-full px-10 py-10 rounded-3xl text-6xl text-center font-bold transition-all focus:scale-105"
                    style={{
                      background: '#FFF8F0',
                      border: '4px solid #FFE4C4',
                      color: '#D2691E',
                      outline: 'none'
                    }}
                    placeholder="5"
                    autoFocus
                  />
                  <p className="text-2xl" style={{ color: '#A0522D' }}>
                    💪 Small projects, big projects, school projects - they all count!
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Willingness to Learn */}
            {currentStep === 4 && (
              <div className="text-center">
                <div className="text-8xl mb-10">🔥</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Learning Mindset
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  How willing are you to learn new coding skills?
                </p>
                <div className="space-y-6">
                  {[
                    { value: 'very_willing', label: '🚀 Very Willing!', desc: 'I love learning new things' },
                    { value: 'somewhat_willing', label: '👍 Somewhat Willing', desc: 'Open to learning' },
                    { value: 'not_willing', label: '🤔 Just Exploring', desc: 'Taking it slow for now' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setData({ ...data, willingToLearn: option.value })}
                      className={`w-full p-12 rounded-3xl transition-all text-left hover:scale-105 ${
                        data.willingToLearn === option.value ? 'scale-105' : ''
                      }`}
                      style={{
                        background: data.willingToLearn === option.value ? '#FFF0E1' : '#FFF8F0',
                        border: data.willingToLearn === option.value ? '4px solid #D2691E' : '4px solid #FFE4C4',
                        boxShadow: data.willingToLearn === option.value ? '0 10px 40px rgba(210, 105, 30, 0.3)' : '0 4px 12px rgba(210, 105, 30, 0.1)'
                      }}
                    >
                      <div className="font-bold text-4xl mb-4" style={{ color: '#D2691E' }}>{option.label}</div>
                      <div className="text-2xl" style={{ color: '#A0522D' }}>{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Languages to Learn */}
            {currentStep === 5 && (
              <div className="text-center">
                <div className="text-8xl mb-10">🌐</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Languages to Learn
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  Which programming languages interest you?
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 max-h-[350px] overflow-y-auto p-2 mb-8">
                  {PROGRAMMING_LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`p-8 rounded-3xl transition-all font-bold text-2xl hover:scale-105 ${
                        data.languagesToLearn.includes(lang) ? 'scale-105' : ''
                      }`}
                      style={{
                        background: data.languagesToLearn.includes(lang) ? '#FFF0E1' : '#FFF8F0',
                        border: data.languagesToLearn.includes(lang) ? '4px solid #D2691E' : '4px solid #FFE4C4',
                        color: '#D2691E',
                        boxShadow: data.languagesToLearn.includes(lang) ? '0 8px 30px rgba(210, 105, 30, 0.3)' : '0 2px 8px rgba(210, 105, 30, 0.1)'
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <p className="text-2xl" style={{ color: '#A0522D' }}>
                  Selected: {data.languagesToLearn.length} language{data.languagesToLearn.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Step 6: Primary Language Interest */}
            {currentStep === 6 && (
              <div className="text-center">
                <div className="text-8xl mb-10">⭐</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Primary Focus
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  Which language do you want to focus on first?
                </p>
                <div className="space-y-5 max-h-[350px] overflow-y-auto">
                  {data.languagesToLearn.length > 0 ? (
                    data.languagesToLearn.map(lang => (
                      <button
                        key={lang}
                        onClick={() => setData({ ...data, primaryLanguageInterest: lang })}
                        className={`w-full p-10 rounded-3xl transition-all hover:scale-105 ${
                          data.primaryLanguageInterest === lang ? 'scale-105' : ''
                        }`}
                        style={{
                          background: data.primaryLanguageInterest === lang ? '#FFF0E1' : '#FFF8F0',
                          border: data.primaryLanguageInterest === lang ? '4px solid #D2691E' : '4px solid #FFE4C4',
                          boxShadow: data.primaryLanguageInterest === lang ? '0 10px 40px rgba(210, 105, 30, 0.3)' : '0 4px 12px rgba(210, 105, 30, 0.1)'
                        }}
                      >
                        <div className="font-bold text-4xl" style={{ color: '#D2691E' }}>{lang}</div>
                      </button>
                    ))
                  ) : (
                    <p className="text-2xl" style={{ color: '#A0522D' }}>Please select languages in the previous step</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 7: Activity Level */}
            {currentStep === 7 && (
              <div className="text-center">
                <div className="text-8xl mb-10">⚡</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Activity Level
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  How active are you with coding currently?
                </p>
                <div className="space-y-6">
                  {[
                    { value: 'very_active', label: '🔥 Very Active', desc: 'I code almost every day' },
                    { value: 'active', label: '💪 Active', desc: 'I code several times a week' },
                    { value: 'somewhat_active', label: '👍 Somewhat Active', desc: 'I code occasionally' },
                    { value: 'inactive', label: '😴 Not Active', desc: 'Just getting started' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setData({ ...data, activityLevel: option.value })}
                      className={`w-full p-12 rounded-3xl transition-all text-left hover:scale-105 ${
                        data.activityLevel === option.value ? 'scale-105' : ''
                      }`}
                      style={{
                        background: data.activityLevel === option.value ? '#FFF0E1' : '#FFF8F0',
                        border: data.activityLevel === option.value ? '4px solid #D2691E' : '4px solid #FFE4C4',
                        boxShadow: data.activityLevel === option.value ? '0 10px 40px rgba(210, 105, 30, 0.3)' : '0 4px 12px rgba(210, 105, 30, 0.1)'
                      }}
                    >
                      <div className="font-bold text-4xl mb-4" style={{ color: '#D2691E' }}>{option.label}</div>
                      <div className="text-2xl" style={{ color: '#A0522D' }}>{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 8: Hours Per Week */}
            {currentStep === 8 && (
              <div className="text-center">
                <div className="text-8xl mb-10">⏰</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Time Commitment
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  How many hours per week can you dedicate to coding?
                </p>
                <div className="space-y-6">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={data.hoursPerWeek || ''}
                    onChange={(e) => setData({ ...data, hoursPerWeek: parseInt(e.target.value) || null })}
                    className="w-full px-10 py-10 rounded-3xl text-6xl text-center font-bold transition-all focus:scale-105"
                    style={{
                      background: '#FFF8F0',
                      border: '4px solid #FFE4C4',
                      color: '#D2691E',
                      outline: 'none'
                    }}
                    placeholder="10"
                    autoFocus
                  />
                  <p className="text-2xl" style={{ color: '#A0522D' }}>
                    Be realistic - even 1-2 hours a week is a great start! ⏱️
                  </p>
                </div>
              </div>
            )}

            {/* Step 9: Commitment Level */}
            {currentStep === 9 && (
              <div className="text-center">
                <div className="text-8xl mb-10">💎</div>
                <h2 className="text-6xl font-bold mb-8" style={{ color: '#8B4513' }}>
                  Your Commitment
                </h2>
                <p className="text-3xl mb-14" style={{ color: '#A0522D' }}>
                  How committed are you to learning and improving?
                </p>
                <div className="space-y-6">
                  {[
                    { value: 'very_committed', label: '🎯 Very Committed', desc: 'This is a top priority for me' },
                    { value: 'committed', label: '💪 Committed', desc: 'Serious about learning' },
                    { value: 'somewhat_committed', label: '👍 Somewhat Committed', desc: 'Will try my best' },
                    { value: 'exploring', label: '🔍 Just Exploring', desc: 'Seeing if this is for me' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setData({ ...data, commitmentLevel: option.value })}
                      className={`w-full p-12 rounded-3xl transition-all text-left hover:scale-105 ${
                        data.commitmentLevel === option.value ? 'scale-105' : ''
                      }`}
                      style={{
                        background: data.commitmentLevel === option.value ? '#FFF0E1' : '#FFF8F0',
                        border: data.commitmentLevel === option.value ? '4px solid #D2691E' : '4px solid #FFE4C4',
                        boxShadow: data.commitmentLevel === option.value ? '0 10px 40px rgba(210, 105, 30, 0.3)' : '0 4px 12px rgba(210, 105, 30, 0.1)'
                      }}
                    >
                      <div className="font-bold text-4xl mb-4" style={{ color: '#D2691E' }}>{option.label}</div>
                      <div className="text-2xl" style={{ color: '#A0522D' }}>{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-12 py-6 rounded-full flex items-center gap-3 font-bold text-2xl transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            style={{ 
              background: currentStep === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.95)',
              color: '#D2691E',
              border: '3px solid rgba(210, 105, 30, 0.2)'
            }}
          >
            <svg width="26" height="26" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"/>
            </svg>
            Back
          </button>

          {currentStep === totalSteps - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="px-16 py-6 rounded-full flex items-center gap-3 font-black text-2xl text-white transition-all hover:scale-110 disabled:hover:scale-100 disabled:opacity-50 shadow-2xl"
              style={{ 
                background: !canProceed() || isSubmitting 
                  ? 'rgba(210, 105, 30, 0.3)' 
                  : 'linear-gradient(135deg, #D2691E, #CD853F, #D2691E)',
                cursor: !canProceed() || isSubmitting ? 'not-allowed' : 'pointer',
                border: '3px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Complete 🎉
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-16 py-6 rounded-full flex items-center gap-3 font-black text-2xl text-white transition-all hover:scale-110 disabled:hover:scale-100 disabled:opacity-50 shadow-2xl"
              style={{ 
                background: !canProceed() 
                  ? 'rgba(210, 105, 30, 0.3)' 
                  : 'linear-gradient(135deg, #D2691E, #CD853F, #D2691E)',
                cursor: !canProceed() ? 'not-allowed' : 'pointer',
                border: '3px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              Next
              <svg width="26" height="26" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.22 2.97a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H3.75a.75.75 0 010-1.5h7.44L8.22 4.03a.75.75 0 010-1.06z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(30px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes floatSlow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(40px, 40px); }
        }

        @keyframes floatSlower {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, -50px); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-slide-in {
          animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-bounce-slow {
          animation: bounceSlow 2.5s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: floatSlow 15s ease-in-out infinite;
        }

        .animate-float-slower {
          animation: floatSlower 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
