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
      <div className="splash-content">
        <div className="logo-wrap" aria-label="RiseUP is loading">
          <Image src="/vercel.svg" alt="RiseUP" width={112} height={112} priority className="logo" />
        </div>
        <div className="splash-progress">
          <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="splash-text">Loading your workspace...</p>
      </div>
      <style>{`
        .splash {
          background: linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%);
          color: #fff;
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: opacity .4s ease;
          will-change: opacity;
        }
        .splash.fade-out { opacity: 0; }
        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }
        .logo-wrap { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }
        .logo { 
          filter: drop-shadow(0 8px 24px rgba(88, 166, 255, 0.3)); 
          animation: pulse 1.5s ease-in-out infinite; 
        }
        .splash-progress {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .splash-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #58a6ff 0%, #2386ff 100%);
          transition: width 0.3s ease;
          border-radius: 2px;
        }
        .splash-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          margin: 0;
          font-weight: 500;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: .9; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: .9; }
        }
      `}</style>
    </div>
  );
}
