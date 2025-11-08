'use client';

import { motion } from 'framer-motion';
import { BADGE_CONFIG } from '@/lib/achievement-utils';
import { format } from 'date-fns';

interface Achievement {
  _id: string;
  badge: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  rarity: string;
  language: string;
  score: number;
  unlockedAt: string;
  challengeTitle?: string;
  nftTokenId?: string;
  minted?: boolean;
}

interface Props {
  achievement: Achievement;
  index?: number;
}

export default function AchievementCard({ achievement, index = 0 }: Props) {
  const badgeConfig = BADGE_CONFIG[achievement.badge];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.5,
      },
    },
  };

  const glowVariants = {
    initial: { boxShadow: `0 0 10px ${badgeConfig.color}` },
    animate: {
      boxShadow: [
        `0 0 10px ${badgeConfig.color}`,
        `0 0 20px ${badgeConfig.color}`,
        `0 0 10px ${badgeConfig.color}`,
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative"
    >
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate="animate"
        className="p-4 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
        style={{ borderColor: badgeConfig.color }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{badgeConfig.emoji}</span>
            <div>
              <h3 className="font-bold text-lg text-white">
                {achievement.language} {achievement.badge}
              </h3>
              <p className="text-sm text-slate-400">
                {achievement.rarity} Rarity
              </p>
            </div>
          </div>
          <span className="text-2xl font-bold" style={{ color: badgeConfig.color }}>
            {achievement.score}%
          </span>
        </div>

        {achievement.challengeTitle && (
          <p className="text-sm text-slate-300 mb-2">
            📚 {achievement.challengeTitle}
          </p>
        )}

        <div className="flex items-center justify-between">
          <time className="text-xs text-slate-500">
            {format(new Date(achievement.unlockedAt), 'MMM dd, yyyy')}
          </time>
          {achievement.minted && achievement.nftTokenId && (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded border border-green-700">
              ✓ Minted #{achievement.nftTokenId}
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
