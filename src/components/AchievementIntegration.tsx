'use client';

import { useState } from 'react';
import AchievementUnlockToast from '@/components/AchievementUnlockToast';
import { useAchievements } from '@/hooks/useAchievements';

interface TestCompletionParams {
  language: string;
  score: number;
  challengeTitle?: string;
  testId?: string;
  walletAddress?: string;
}

export function AchievementIntegration() {
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);
  const { unlockAchievement } = useAchievements();

  const handleTestCompletion = async (params: TestCompletionParams) => {
    // Only trigger achievement if score is 70% or higher
    if (params.score >= 70) {
      const result = await unlockAchievement(params);

      if (result?.success && result?.achievement) {
        setUnlockedAchievement(result.achievement);
      } else if (!result?.success) {
        // Score threshold met but maybe user already has this badge
        console.log(result?.message);
      }
    }
  };

  return {
    handleTestCompletion,
    unlockedAchievement,
    setUnlockedAchievement,
    AchievementToast: unlockedAchievement ? (
      <AchievementUnlockToast
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
    ) : null,
  };
}
