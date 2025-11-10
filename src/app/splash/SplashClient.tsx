"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setUser } from '@/lib/user-client';

export default function SplashClient({ target }: { target: string }) {
  const router = useRouter();
  const [fade, setFade] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    
    const preloadResources = async () => {
      const start = Date.now();
      let nextTarget = target;
      
      try {
        setProgress(20);
        
        // Fetch user data
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        setProgress(50);
        
        if (res.ok) {
          const data = await res.json();
          
          // Set global user state
          if (data.user) {
            setUser(data.user);
            sessionStorage.setItem('app:user', JSON.stringify(data.user));
          }
          
          setProgress(70);
          
          // Prefetch critical data
          try {
            // Preload tasks if user is authenticated
            await fetch('/api/tasks', { cache: 'no-store' });
          } catch {}
          
          setProgress(90);
          nextTarget = '/dashboard';
        } else if (res.status === 401 || res.status === 403) {
          setProgress(90);
          nextTarget = '/auth/login';
        }
      } catch (error) {
        console.error('Splash preload error:', error);
        setProgress(90);
        // Network issue: fall back to original target
      }
      
      setProgress(100);
      
      // Ensure at least 1.5s display time for smooth experience
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 1500 - elapsed);
      await new Promise((r) => setTimeout(r, wait));
      
      if (cancelled) return;
      
      setFade(true);
      setTimeout(() => {
        if (!cancelled) router.replace(nextTarget);
      }, 300);
    };

    preloadResources();
    
    return () => { cancelled = true; };
  }, [router, target]);

  return (
    <div className={`splash ${fade ? 'fade-out' : ''}`}>
      {/* Animated background gradient */}
      <div className="splash-bg-gradient" />
      
      {/* Particle effects */}
      <div className="splash-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }} />
        ))}
      </div>

      <div className="splash-content">
        {/* Logo with glow effect */}
        <div className="logo-container" aria-label="RiseUp is loading">
          <div className="logo-glow" />
          <div className="logo-ring" />
          <Image 
            src="/144.png" 
            alt="RiseUp" 
            width={144} 
            height={144} 
            priority 
            className="logo" 
          />
        </div>

        {/* Brand name with animated gradient */}
        <h1 className="brand-name">
          <span className="brand-rise">Rise</span>
          <span className="brand-up">Up</span>
        </h1>

        {/* Modern progress bar */}
        <div className="splash-progress">
          <div className="splash-progress-track">
            <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
            <div className="splash-progress-glow" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-text">{progress}%</p>
        </div>

        {/* Status text */}
        <p className="splash-text">
          {progress < 30 && "Initializing..."}
          {progress >= 30 && progress < 70 && "Loading your workspace..."}
          {progress >= 70 && progress < 100 && "Almost ready..."}
          {progress === 100 && "Ready!"}
        </p>
      </div>

      <style>{`
        .splash {
          background: #0a0e1a;
          color: #fff;
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: opacity .5s ease;
          will-change: opacity;
          overflow: hidden;
        }
        
        .splash.fade-out { opacity: 0; }

        /* Animated background gradient */
        .splash-bg-gradient {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 70%);
          animation: bgPulse 8s ease-in-out infinite;
        }

        @keyframes bgPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        /* Floating particles */
        .splash-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          animation: float linear infinite;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        /* Main content */
        .splash-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          animation: contentFadeIn 0.8s ease-out;
        }

        @keyframes contentFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Logo container with effects */
        .logo-container { 
          position: relative;
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 180px;
          height: 180px;
        }

        .logo-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
          animation: glowPulse 2s ease-in-out infinite;
          border-radius: 50%;
        }

        @keyframes glowPulse {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .logo-ring {
          position: absolute;
          inset: -10px;
          border: 2px solid transparent;
          border-radius: 50%;
          background: 
            linear-gradient(#0a0e1a, #0a0e1a) padding-box,
            linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899) border-box;
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .logo { 
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.6));
          animation: logoFloat 3s ease-in-out infinite;
        }

        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }

        /* Brand name */
        .brand-name {
          font-size: 48px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
          display: flex;
          gap: 8px;
          animation: textGlow 3s ease-in-out infinite;
        }

        .brand-rise {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite;
        }

        .brand-up {
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite;
          animation-delay: 0.5s;
        }

        @keyframes shimmer {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }

        /* Progress bar */
        .splash-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 280px;
        }

        .splash-progress-track {
          position: relative;
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .splash-progress-bar {
          position: absolute;
          inset: 0;
          width: 0%;
          background: linear-gradient(90deg, 
            #3b82f6 0%, 
            #8b5cf6 50%, 
            #ec4899 100%
          );
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 999px;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }

        .splash-progress-glow {
          position: absolute;
          inset: -2px;
          width: 0%;
          background: linear-gradient(90deg, 
            rgba(59, 130, 246, 0.3) 0%, 
            rgba(139, 92, 246, 0.3) 50%, 
            rgba(236, 72, 153, 0.3) 100%
          );
          filter: blur(8px);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 999px;
        }

        .progress-text {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          font-variant-numeric: tabular-nums;
        }

        /* Status text */
        .splash-text {
          color: rgba(255, 255, 255, 0.5);
          font-size: 15px;
          margin: 0;
          font-weight: 500;
          letter-spacing: 0.02em;
          animation: textFade 2s ease-in-out infinite;
        }

        @keyframes textFade {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* Responsive design */
        @media (max-width: 640px) {
          .brand-name {
            font-size: 36px;
          }
          
          .logo-container {
            width: 140px;
            height: 140px;
          }
          
          .splash-progress {
            width: 240px;
          }
        }
      `}</style>
    </div>
  );
}
