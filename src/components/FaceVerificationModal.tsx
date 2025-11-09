'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, X, AlertCircle, CheckCircle } from 'lucide-react';

interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
  message?: string;
}

/**
 * Face Verification Modal
 * Used to verify user identity before sensitive operations
 */
export default function FaceVerificationModal({
  isOpen,
  onClose,
  onVerified,
  title = 'Verify Your Identity',
  message = 'For security, please verify your face to continue',
}: FaceVerificationModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
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

  // Capture photo and verify
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      
      ctx.drawImage(video, 0, 0);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
      });

      const file = new File([blob], 'face-verification.jpg', { type: 'image/jpeg' });

      // Verify the face
      const formData = new FormData();
      formData.append('image', file);
      
      const verifyResponse = await fetch('/api/face/verify', {
        method: 'POST',
        body: formData,
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.matched && verifyData.confidence > 0.60) {
        setSuccess('Face verified successfully!');
        stopCamera();
        
        // Call onVerified callback after a brief delay
        setTimeout(() => {
          onVerified();
          onClose();
        }, 1000);
      } else {
        setError(`Face verification failed (${Math.round((verifyData.confidence || 0) * 100)}% match). Please try again.`);
      }
    } catch (err: any) {
      setError(err.message || 'Face verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [onVerified, onClose, stopCamera]);

  // Close modal and cleanup
  const handleClose = () => {
    stopCamera();
    setError('');
    setSuccess('');
    setShowCamera(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .face-modal-container {
            padding: 12px !important;
          }
          .face-modal-content {
            max-width: 100% !important;
            padding: 20px 16px !important;
            border-radius: 8px !important;
          }
          .face-modal-header h3 {
            font-size: 18px !important;
          }
          .face-modal-header p {
            font-size: 13px !important;
          }
          .face-video-container {
            border-radius: 6px !important;
          }
        }
        @media (max-width: 480px) {
          .face-modal-content {
            max-height: 90vh !important;
            overflow-y: auto !important;
          }
          .face-modal-buttons button {
            padding: 14px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
      <div 
        className="face-modal-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}
      >
        <div 
          className="face-modal-content"
          style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px',
          }}
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="face-modal-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Camera style={{ margin: '0 auto 12px', width: '48px', height: '48px', color: '#2563eb' }} />
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
            {title}
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {message}
          </p>
        </div>

        {/* Error message */}
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

        {/* Success message */}
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
          <div 
            className="face-video-container"
            style={{ 
              marginBottom: '16px', 
              position: 'relative', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              background: '#000',
              aspectRatio: '4/3',
              maxHeight: '400px'
            }}
          >
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

        {/* Action buttons */}
        <div className="face-modal-buttons">
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
                fontSize: '16px',
                cursor: isVerifying ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '44px'
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
                  fontSize: '16px',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  minHeight: '44px'
                }}
                onMouseOver={(e) => !isVerifying && (e.currentTarget.style.background = '#059669')}
                onMouseOut={(e) => !isVerifying && (e.currentTarget.style.background = '#10b981')}
              >
                {isVerifying ? (
                  <>
                    <span className="spinner-small"></span>
                    Verifying...
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
                  padding: '14px',
                  background: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '15px',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  minHeight: '44px'
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
