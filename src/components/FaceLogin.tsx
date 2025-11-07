'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { setUser as setGlobalUser } from '@/lib/user-client';
import { authClient } from '@/lib/auth-client';

/**
 * Face Login Component
 * Allows users to login with face recognition only (no password, no 2FA)
 * Uses live camera capture for enhanced security (no file uploads allowed)
 */
export default function FaceLogin() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'face'>('email');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Video play error:', err);
          });
        }
      }, 100);
    } catch (err) {
      setError('Unable to access camera. Please allow camera permissions.');
      console.error('Camera error:', err);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
    }
  }, [stream]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'face-capture.jpg', { type: 'image/jpeg' });
          stopCamera();
          handleFaceVerification(file);
        }
      }, 'image/jpeg', 0.95);
    }
  }, [stopCamera]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    
    // Check if user has face registered
    try {
      const response = await fetch(`/api/face/check-status?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.faceRegistered) {
        setStep('face');
        setError('');
        setSuccess('Face authentication available! Please verify your face.');
      } else {
        setError('Face authentication not set up. Please use password login or set up face authentication in your profile.');
      }
    } catch (err) {
      setError('Error checking face authentication status');
    }
  };

  const handleFaceVerification = async (file: File) => {
    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      // First verify the face
      const formData = new FormData();
      formData.append('image', file);
      formData.append('email', email); // Add email for verification
      
      const verifyResponse = await fetch('/api/face/verify', {
        method: 'POST',
        body: formData,
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.matched && verifyData.confidence > 0.65) {
        // Face verified! 
        const loginResponse = await fetch('/api/auth/face-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            faceVerified: true,
            confidence: verifyData.confidence 
          }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok && loginData.faceLoginVerified) {
          setSuccess('Face verified! Redirecting...');
          
          // Set global user
          if (loginData.user) {
            setGlobalUser(loginData.user);
          }
          
          // Just redirect - the user will be logged in on next page load
          // (This is a temporary workaround until we properly integrate with Better Auth's session creation)
          window.location.href = '/dashboard';
        } else {
          throw new Error(loginData.error || 'Login failed');
        }
      } else {
        setError(`Face not recognized (${Math.round((verifyData.confidence || 0) * 100)}% match). Please try again or use password login.`);
      }
    } catch (err: any) {
      setError(err.message || 'Face verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === 'email') {
    return (
      <div style={{ padding: '20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Camera style={{ margin: '0 auto 12px', width: '48px', height: '48px', color: '#2563eb' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Face Login</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Enter your email to verify face authentication</p>
        </div>

        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="your@email.com"
              required
            />
          </div>

          {error && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px', 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px', 
              fontSize: '14px', 
              color: '#991b1b' 
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {success && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px', 
              background: '#f0fdf4', 
              border: '1px solid #86efac', 
              borderRadius: '8px', 
              fontSize: '14px', 
              color: '#166534' 
            }}>
              <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {success}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  // Face verification step
  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Camera style={{ margin: '0 auto 12px', width: '48px', height: '48px', color: '#2563eb' }} />
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Scan Your Face</h3>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>Take a photo or upload an image to verify your identity</p>
      </div>

      {error && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '12px', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px', 
          fontSize: '14px', 
          color: '#991b1b',
          marginBottom: '16px'
        }}>
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '12px', 
          background: '#f0fdf4', 
          border: '1px solid #86efac', 
          borderRadius: '8px', 
          fontSize: '14px', 
          color: '#166534',
          marginBottom: '16px'
        }}>
          <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {success}
        </div>
      )}

      {/* Camera preview */}
      {showCamera && (
        <div style={{ 
          marginBottom: '16px', 
          position: 'relative', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          background: '#000',
          aspectRatio: '4/3'
        }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            style={{ 
              width: '100%', 
              height: '100%',
              display: 'block', 
              objectFit: 'cover'
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {!showCamera ? (
        <button
          onClick={startCamera}
          disabled={isVerifying}
          style={{
            width: '100%',
            padding: '16px',
            background: isVerifying ? '#9ca3af' : '#2563eb',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            cursor: isVerifying ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => !isVerifying && (e.currentTarget.style.background = '#1d4ed8')}
          onMouseOut={(e) => !isVerifying && (e.currentTarget.style.background = '#2563eb')}
        >
          <Camera style={{ width: '20px', height: '20px' }} />
          Start Camera
        </button>
      ) : (
        <>
          <button
            onClick={capturePhoto}
            disabled={isVerifying}
            style={{
              width: '100%',
              padding: '16px',
              background: isVerifying ? '#9ca3af' : '#10b981',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '500',
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}
            onMouseOver={(e) => !isVerifying && (e.currentTarget.style.background = '#059669')}
            onMouseOut={(e) => !isVerifying && (e.currentTarget.style.background = '#10b981')}
          >
            {isVerifying ? (
              <>
                <span className="spinner-small"></span>
                Verifying face...
              </>
            ) : (
              <>
                <Camera style={{ width: '20px', height: '20px' }} />
                Capture & Verify
              </>
            )}
          </button>

          <button
            onClick={stopCamera}
            disabled={isVerifying}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel Camera
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setStep('email');
          setError('');
          setSuccess('');
        }}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '10px',
          background: 'transparent',
          color: '#6b7280',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ← Back
      </button>
    </div>
  );
}
