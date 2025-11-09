'use client';

import { useState, useCallback } from 'react';

interface UnlockAchievementParams {
  language: string;
  score: number;
  challengeTitle?: string;
  testId?: string;
  walletAddress?: string;
}

interface AchievementResponse {
  success: boolean;
  message: string;
  achievement?: any;
  metadata?: any;
}

export function useAchievements() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockAchievement = useCallback(
    async (params: UnlockAchievementParams): Promise<AchievementResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/achievements/unlock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          throw new Error('Failed to unlock achievement');
        }

        const data: AchievementResponse = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Achievement unlock error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    unlockAchievement,
    isLoading,
    error,
  };
}
