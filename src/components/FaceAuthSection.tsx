'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, Upload, Trash2, Shield, Video, X, RefreshCw } from 'lucide-react';

// Add keyframes for spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.querySelector('style[data-face-auth-animations]')) {
    style.setAttribute('data-face-auth-animations', 'true');
    document.head.appendChild(style);
  }
}

interface FaceAuthSectionProps {
  userEmail: string;
  initialFaceRegistered?: boolean;
  isPremium?: boolean;
}

export default function FaceAuthSection({ 
  userEmail, 
  initialFaceRegistered = false,
  isPremium = false 
}: FaceAuthSectionProps) {
  const [faceRegistered, setFaceRegistered] = useState(initialFaceRegistered);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    confidence: number;
    message: string;
  } | null>(null);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'register' | 'verify' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const registerFileInputRef = useRef<HTMLInputElement>(null);
  const verifyFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch face registration status on mount
  useEffect(() => {
    const fetchFaceStatus = async () => {
      try {
        const response = await fetch('/api/face/register');
        if (response.ok) {
          const data = await response.json();
          setFaceRegistered(data.faceRegistered || false);
        }
      } catch (error) {
        console.error('Failed to fetch face status:', error);
      }
    };

    if (isPremium) {
      fetchFaceStatus();
    }
  }, [isPremium]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Start camera
  const startCamera = async (mode: 'register' | 'verify') => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setCameraMode(mode);
      setShowCamera(true);
      setCapturedImage(null);
      setMessage('');
      setVerificationResult(null);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      }, 100);
    } catch (error: any) {
      setMessage(`❌ Camera access denied: ${error.message}`);
      console.error('Camera error:', error);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraMode(null);
    setCapturedImage(null);
    setCountdown(null);
  };

  // Capture photo with countdown
  const capturePhoto = () => {
    let count = 3;
    setCountdown(count);
    
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
        
        // Capture the image
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedImage(imageData);
          }
        }
      }
    }, 1000);
  };

  // Convert data URL to File
  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Confirm captured photo
  const confirmCapture = async () => {
    if (!capturedImage) return;
    
    const file = dataURLtoFile(capturedImage, `face-${Date.now()}.jpg`);
    
    if (cameraMode === 'register') {
      await handleRegisterFace(file);
    } else if (cameraMode === 'verify') {
      await handleVerifyFace(file);
    }
    
    stopCamera();
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleRegisterFace = useCallback(async (file: File) => {
    setIsRegistering(true);
    setMessage('');
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/face/register', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFaceRegistered(true);
        setMessage('✅ Face registered successfully! You can now use face authentication.');
      } else {
        setMessage(`❌ ${data.error || 'Registration failed'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const handleVerifyFace = useCallback(async (file: File) => {
    setIsVerifying(true);
    setMessage('');
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('threshold', '0.6'); // Default threshold

      const response = await fetch('/api/face/verify', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationResult({
          success: data.matched,
          confidence: Math.round(data.confidence * 100),
          message: data.message,
        });
      } else {
        setMessage(`❌ ${data.error || 'Verification failed'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const handleDeleteFace = async () => {
    if (!confirm('Are you sure you want to delete your face registration?')) {
      return;
    }

    setIsDeleting(true);
    setMessage('');
    setVerificationResult(null);

    try {
      const response = await fetch('/api/face/register', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFaceRegistered(false);
        setMessage('✅ Face registration deleted successfully');
      } else {
        setMessage(`❌ ${data.error || 'Deletion failed'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRegisterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRegisterFace(file);
    }
  };

  const handleVerifyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVerifyFace(file);
    }
  };

  // Premium feature gate
  if (!isPremium) {
    return (
      <div className="github-card" style={{ padding: '20px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'rgba(234, 179, 8, 0.1)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Shield className="w-6 h-6" style={{ color: '#eab308' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Face Authentication</h3>
              <span style={{ 
                padding: '4px 10px', 
                background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '12px'
              }}>
                PREMIUM
              </span>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
              Unlock biometric face authentication for enhanced security. Register your face and verify your identity in seconds with AI-powered recognition.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                <span>AI Face Recognition</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                <span>Live Camera Capture</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                <span>Secure Verification</span>
              </div>
            </div>
            <a
              href="/dashboard/premium"
              className="github-btn github-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '14px' }}
            >
              <Shield className="w-4 h-4" />
              Upgrade to Premium
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Camera Modal */}
      {showCamera && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Header */}
          <div style={{
            width: '100%',
            maxWidth: '800px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 600, margin: 0 }}>
                {cameraMode === 'register' ? 'Register Your Face' : 'Verify Your Face'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '4px 0 0 0' }}>
                {capturedImage ? 'Review your photo' : 'Position your face in the circle'}
              </p>
            </div>
            <button
              onClick={stopCamera}
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X className="w-6 h-6" style={{ color: 'white' }} />
            </button>
          </div>

          {/* Camera/Preview Area */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '800px',
            aspectRatio: '4/3',
            background: '#1a1a1a',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {!capturedImage ? (
              <>
                {/* Loading indicator */}
                {!stream && (
                  <div style={{
                    position: 'absolute',
                    color: 'white',
                    fontSize: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid rgba(255,255,255,0.2)',
                      borderTop: '4px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>Starting camera...</span>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: stream ? 'block' : 'none',
                    transform: 'scaleX(-1)' // Mirror the video for a natural selfie view
                  }}
                />
                
                {/* Face Circle Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    width: '280px',
                    height: '350px',
                    border: '3px dashed rgba(255,255,255,0.8)',
                    borderRadius: '50%',
                    position: 'relative'
                  }}>
                    {countdown !== null && countdown > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: '120px',
                        fontWeight: 'bold',
                        textShadow: '0 0 20px rgba(0,0,0,0.5)'
                      }}>
                        {countdown}
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions - Always visible at bottom */}
                <div style={{
                  position: 'absolute',
                  bottom: '100px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '12px 24px',
                  borderRadius: '24px',
                  whiteSpace: 'nowrap'
                }}>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: 500, margin: 0 }}>
                    Align your face with the circle
                  </p>
                </div>
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            )}
          </div>

          {/* Controls - Always visible at bottom */}
          <div style={{
            width: '100%',
            maxWidth: '800px',
            padding: '20px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                disabled={countdown !== null}
                className="github-btn github-btn-primary"
                style={{
                  padding: '16px 48px',
                  fontSize: '16px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: countdown !== null ? 0.5 : 1
                }}
              >
                <Camera className="w-6 h-6" />
                {countdown !== null ? `Capturing in ${countdown}...` : 'Take Photo'}
              </button>
            ) : (
              <>
                <button
                  onClick={retakePhoto}
                  className="github-btn"
                  style={{
                    padding: '16px 32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <RefreshCw className="w-5 h-5" />
                  Retake
                </button>
                <button
                  onClick={confirmCapture}
                  disabled={isRegistering || isVerifying}
                  className="github-btn github-btn-primary"
                  style={{
                    padding: '16px 32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: (isRegistering || isVerifying) ? 0.5 : 1
                  }}
                >
                  {isRegistering || isVerifying ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Card */}
      <div className="github-card" style={{ padding: '20px', background: 'var(--panel)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'rgba(31, 111, 235, 0.1)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Camera className="w-5 h-5" style={{ color: '#1f6feb' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Face Authentication</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>AI-powered biometric security</p>
          </div>
          {faceRegistered && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px'
            }}>
              <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>Active</span>
            </div>
          )}
        </div>

        <div>{/* Content will continue below */}

          {/* Status Message */}
          {message && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '16px',
              background: message.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              {message.startsWith('✅') ? (
                <CheckCircle className="w-5 h-5" style={{ color: '#10b981', flexShrink: 0 }} />
              ) : (
                <XCircle className="w-5 h-5" style={{ color: '#ef4444', flexShrink: 0 }} />
              )}
              <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{message}</p>
            </div>
          )}

          {/* Verification Result */}
          {verificationResult && (
            <div style={{
              padding: '16px',
              marginBottom: '16px',
              background: verificationResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${verificationResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: verificationResult.success ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {verificationResult.success ? (
                  <CheckCircle className="w-6 h-6" style={{ color: 'white' }} />
                ) : (
                  <XCircle className="w-6 h-6" style={{ color: 'white' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  fontSize: '15px', 
                  fontWeight: 600, 
                  margin: '0 0 8px 0',
                  color: verificationResult.success ? '#065f46' : '#991b1b'
                }}>
                  {verificationResult.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    flex: 1,
                    height: '6px',
                    background: 'rgba(0,0,0,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${verificationResult.confidence}%`,
                      background: verificationResult.success ? '#10b981' : '#ef4444',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: verificationResult.success ? '#065f46' : '#991b1b'
                  }}>
                    {verificationResult.confidence}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!faceRegistered ? (
              // Register Face Section
              <>
                <button
                  onClick={() => startCamera('register')}
                  disabled={isRegistering}
                  className="github-btn github-btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: '15px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    opacity: isRegistering ? 0.6 : 1
                  }}
                >
                  {isRegistering ? (
                    <>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Registering Face...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Take Photo with Camera
                    </>
                  )}
                </button>

                <div style={{ position: 'relative', textAlign: 'center', margin: '8px 0' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'var(--border)' }}></div>
                  <span style={{ 
                    position: 'relative', 
                    padding: '0 12px', 
                    background: 'var(--panel)', 
                    fontSize: '12px', 
                    color: 'var(--muted)' 
                  }}>
                    or upload an image
                  </span>
                </div>

                <input
                  ref={registerFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleRegisterFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => registerFileInputRef.current?.click()}
                  disabled={isRegistering}
                  className="github-btn"
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isRegistering ? 0.6 : 1
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Upload from Device
                </button>
              </>
            ) : (
              // Verify and Delete Section
              <>
                <button
                  onClick={() => startCamera('verify')}
                  disabled={isVerifying}
                  className="github-btn github-btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: '15px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: '#10b981',
                    opacity: isVerifying ? 0.6 : 1
                  }}
                >
                  {isVerifying ? (
                    <>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Verify with Camera
                    </>
                  )}
                </button>

                <div style={{ position: 'relative', textAlign: 'center', margin: '8px 0' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'var(--border)' }}></div>
                  <span style={{ 
                    position: 'relative', 
                    padding: '0 12px', 
                    background: 'var(--panel)', 
                    fontSize: '12px', 
                    color: 'var(--muted)' 
                  }}>
                    or upload an image
                  </span>
                </div>

                <input
                  ref={verifyFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleVerifyFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => verifyFileInputRef.current?.click()}
                  disabled={isVerifying}
                  className="github-btn"
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isVerifying ? 0.6 : 1
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Upload from Device
                </button>

                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={handleDeleteFace}
                    disabled={isDeleting}
                    className="github-btn"
                    style={{
                      width: '100%',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      opacity: isDeleting ? 0.6 : 1
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ef4444',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Face Registration
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Information Box */}
          <div style={{
            marginTop: '16px',
            padding: '14px',
            background: 'rgba(31, 111, 235, 0.05)',
            border: '1px solid rgba(31, 111, 235, 0.15)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>💡</span>
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>Tips for Best Results</h4>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '12px', color: 'var(--muted)' }}>
                  <li style={{ marginBottom: '4px', display: 'flex', gap: '6px' }}>
                    <span>•</span>
                    <span>Use good lighting with your face clearly visible</span>
                  </li>
                  <li style={{ marginBottom: '4px', display: 'flex', gap: '6px' }}>
                    <span>•</span>
                    <span>Face the camera directly (no side angles)</span>
                  </li>
                  <li style={{ marginBottom: '4px', display: 'flex', gap: '6px' }}>
                    <span>•</span>
                    <span>Remove sunglasses or face coverings</span>
                  </li>
                  <li style={{ display: 'flex', gap: '6px' }}>
                    <span>•</span>
                    <span>Ensure only one face is in the image</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
