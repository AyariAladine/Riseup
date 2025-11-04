'use client';

import { useState, useRef } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { signIn } from '@/lib/auth-client';

/**
 * Optional Face Login Component
 * Can be added to login page as alternative to password
 */
export default function FaceLogin() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'face'>('email');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      } else {
        setError('Face authentication not set up. Please use password login.');
      }
    } catch (err) {
      setError('Error checking face authentication status');
    }
  };

  const handleFaceVerification = async (file: File) => {
    setIsVerifying(true);
    setError('');

    try {
      // First verify the face
      const formData = new FormData();
      formData.append('image', file);
      
      const verifyResponse = await fetch('/api/face/verify', {
        method: 'POST',
        body: formData,
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.matched && verifyData.confidence > 0.65) {
        // Face verified! Now sign in
        // Note: You'll need to create a special face-login endpoint
        // that accepts face verification instead of password
        const loginResponse = await fetch('/api/auth/face-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            faceVerified: true,
            confidence: verifyData.confidence 
          }),
        });

        if (loginResponse.ok) {
          window.location.href = '/dashboard';
        } else {
          throw new Error('Login failed');
        }
      } else {
        setError('Face not recognized. Please try again or use password login.');
      }
    } catch (err: any) {
      setError(err.message || 'Face verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFaceVerification(file);
    }
  };

  if (step === 'email') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <Camera className="w-12 h-12 mx-auto text-blue-600 mb-2" />
          <h3 className="text-lg font-semibold text-gray-900">Face Login</h3>
          <p className="text-sm text-gray-600">Enter your email to continue</p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue
          </button>

          <button
            type="button"
            onClick={() => window.location.href = '/auth/login'}
            className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Use Password Instead
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Camera className="w-12 h-12 mx-auto text-blue-600 mb-2" />
        <h3 className="text-lg font-semibold text-gray-900">Verify Your Face</h3>
        <p className="text-sm text-gray-600">Take a photo to sign in</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isVerifying}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isVerifying ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            Capture Face
          </>
        )}
      </button>

      <button
        onClick={() => setStep('email')}
        className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
      >
        Back
      </button>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          💡 <strong>Tips:</strong> Face the camera directly in good lighting. Make sure your face is clearly visible.
        </p>
      </div>
    </div>
  );
}
