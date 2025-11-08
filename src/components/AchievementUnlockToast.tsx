'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_CONFIG } from '@/lib/achievement-utils';

interface Achievement {
  badge: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  language: string;
  score: number;
}

interface Props {
  achievement: Achievement;
  onClose: () => void;
}

export default function AchievementUnlockToast({ achievement, onClose }: Props) {
  const badgeConfig = BADGE_CONFIG[achievement.badge];

  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{
          type: 'spring' as const,
          stiffness: 300,
          damping: 20,
        }}
        className="fixed bottom-8 right-8 z-50"
      >
        <motion.div
          className="relative p-6 rounded-lg border-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
          style={{ borderColor: badgeConfig.color }}
        >
          {/* Background glow effect */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at center, ${badgeConfig.color}, transparent)`,
            }}
          />

          {/* Confetti particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [-10, -30, -50],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 1.5,
                ease: 'easeOut' as const,
              }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${20 + i * 13}%`,
                top: '50%',
                backgroundColor: badgeConfig.color,
              }}
            />
          ))}

          {/* Content */}
          <div className="relative flex items-center gap-4">
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.2,
                type: 'spring' as const,
                stiffness: 200,
                damping: 15,
              }}
              className="text-6xl flex-shrink-0"
            >
              {badgeConfig.emoji}
            </motion.span>

            <div className="flex-1">
              <h3 className="font-bold text-white text-lg mb-1">
                🎉 Achievement Unlocked!
              </h3>
              <p className="text-slate-300 text-sm mb-2">
                {achievement.language} {achievement.badge} Badge
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: badgeConfig.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${achievement.score}%` }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  />
                </div>
                <span
                  className="font-bold text-sm"
                  style={{ color: badgeConfig.color }}
                >
                  {achievement.score}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
