'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { Loader2, Medal, Users } from 'lucide-react';

interface LeaderboardEntry {
  _id: string;
  rank: number;
  totalBadges: number;
  totalScore: number;
  avgScore: number;
  languages: string[];
  badgeTypes: string[];
  diamondBadges: number;
  goldBadges: number;
  silverBadges: number;
  bronzeBadges: number;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
}

interface LeaderboardData {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  language: string;
  count: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LeaderboardPage() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const { data, isLoading, error } = useSWR<LeaderboardData>(
    selectedLanguage
      ? `/api/achievements/leaderboard?language=${selectedLanguage}&limit=20`
      : `/api/achievements/leaderboard?limit=20`,
    fetcher
  );

  const leaderboard = data?.leaderboard || [];
  const languages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Rust'];

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-slate-700 to-slate-800';
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-20">
      {/* Header */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-6"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <Medal className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-white">Leaderboard</h1>
          </motion.div>

          {/* Language Filter */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedLanguage(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedLanguage === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Languages
            </motion.button>
            {languages.map((lang) => (
              <motion.button
                key={lang}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedLanguage === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {lang}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-6 py-8"
      >
        {isLoading ? (
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center py-20"
          >
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </motion.div>
        ) : error ? (
          <motion.div
            variants={itemVariants}
            className="text-center py-20 text-red-400"
          >
            <p>Failed to load leaderboard</p>
          </motion.div>
        ) : leaderboard.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="text-center py-20"
          >
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-xl text-slate-400">No participants yet</p>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="space-y-3">
            {leaderboard.map((entry: LeaderboardEntry) => (
              <motion.div
                key={entry._id}
                whileHover={{ x: 8 }}
                className={`p-4 rounded-lg bg-gradient-to-r ${getRankColor(
                  entry.rank
                )} bg-opacity-10 border border-slate-700 hover:border-slate-600 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank Medal */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-lg">
                      {getRankMedal(entry.rank)}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-white">{entry.userName}</p>
                        <div className="flex gap-1">
                          {entry.diamondBadges > 0 && (
                            <span title="Diamond badges" className="text-lg">
                              💎 {entry.diamondBadges}
                            </span>
                          )}
                          {entry.goldBadges > 0 && (
                            <span title="Gold badges" className="text-lg">
                              🥇 {entry.goldBadges}
                            </span>
                          )}
                          {entry.silverBadges > 0 && (
                            <span title="Silver badges" className="text-lg">
                              🥈 {entry.silverBadges}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-400">
                        {entry.languages.join(', ')} • Avg Score: {entry.avgScore.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <p className="font-bold text-white text-lg">{entry.totalBadges}</p>
                    <p className="text-xs text-slate-400">Badges</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
