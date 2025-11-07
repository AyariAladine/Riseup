import { useState, useCallback } from 'react';

interface UseFaceVerificationReturn {
  isModalOpen: boolean;
  openVerification: () => void;
  closeVerification: () => void;
  handleVerified: () => Promise<void>;
  verifyWithFace: (action: () => void | Promise<void>) => Promise<void>;
}

/**
 * Hook to add face verification to sensitive actions
 * Usage:
 * const { FaceVerificationModal, verifyWithFace } = useFaceVerification();
 * 
 * Then call: verifyWithFace(() => { // sensitive action here })
 */
export function useFaceVerification(): UseFaceVerificationReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

  const openVerification = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeVerification = useCallback(() => {
    setIsModalOpen(false);
    setPendingAction(null);
  }, []);

  const verifyWithFace = useCallback(async (action: () => void | Promise<void>) => {
    // Check if user has face recognition enabled
    try {
      const response = await fetch('/api/face/status');
      const data = await response.json();
      
      if (!data.faceRegistered) {
        // User doesn't have face recognition enabled, just execute the action
        await action();
        return;
      }

      // User has face recognition, require verification
      setPendingAction(() => action);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error checking face status:', error);
      // On error, just execute the action
      await action();
    }
  }, []);

  const handleVerified = useCallback(async () => {
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
    setIsModalOpen(false);
  }, [pendingAction]);

  return {
    isModalOpen,
    openVerification,
    closeVerification,
    handleVerified,
    verifyWithFace,
  };
}
