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
            {leaderboard.map((entry: LeaderboardEntry) => {
              // Calculate dominant badge color based on highest tier
              const getDominantBadgeColor = () => {
                if (entry.diamondBadges > 0) return { color: '#9333ea', name: 'Diamond' };
                if (entry.goldBadges > 0) return { color: '#f59e0b', name: 'Gold' };
                if (entry.silverBadges > 0) return { color: '#6b7280', name: 'Silver' };
                if (entry.bronzeBadges > 0) return { color: '#cd7f32', name: 'Bronze' };
                return { color: '#64748b', name: 'None' };
              };
              
              const dominantBadge = getDominantBadgeColor();
              
              return (
              <motion.div
                key={entry._id}
                whileHover={{ x: 8 }}
                className={`p-6 rounded-lg bg-gradient-to-r ${getRankColor(
                  entry.rank
                )} bg-opacity-10 border border-slate-700 hover:border-slate-600 transition-all`}
                style={{
                  borderLeft: `4px solid ${dominantBadge.color}`
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank Medal */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {getRankMedal(entry.rank)}
                    </div>

                    {/* User Avatar */}
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 border-2" style={{ borderColor: dominantBadge.color }}>
                      {entry.userAvatar ? (
                        <img 
                          src={entry.userAvatar} 
                          alt={entry.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                          {entry.userName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-white text-lg truncate">{entry.userName || 'Anonymous'}</p>
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${dominantBadge.color}20`, 
                            color: dominantBadge.color 
                          }}
                        >
                          {dominantBadge.name}
                        </span>
                      </div>
                      
                      {/* Badge Distribution Bar */}
                      <div className="mb-2">
                        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
                          {entry.diamondBadges > 0 && (
                            <div 
                              className="bg-purple-600" 
                              style={{ width: `${(entry.diamondBadges / entry.totalBadges) * 100}%` }}
                              title={`${entry.diamondBadges} Diamond`}
                            />
                          )}
                          {entry.goldBadges > 0 && (
                            <div 
                              className="bg-amber-500" 
                              style={{ width: `${(entry.goldBadges / entry.totalBadges) * 100}%` }}
                              title={`${entry.goldBadges} Gold`}
                            />
                          )}
                          {entry.silverBadges > 0 && (
                            <div 
                              className="bg-gray-500" 
                              style={{ width: `${(entry.silverBadges / entry.totalBadges) * 100}%` }}
                              title={`${entry.silverBadges} Silver`}
                            />
                          )}
                          {entry.bronzeBadges > 0 && (
                            <div 
                              className="bg-orange-700" 
                              style={{ width: `${(entry.bronzeBadges / entry.totalBadges) * 100}%` }}
                              title={`${entry.bronzeBadges} Bronze`}
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* Badge Counts */}
                      <div className="flex items-center gap-3 text-sm">
                        {entry.diamondBadges > 0 && (
                          <span className="flex items-center gap-1 text-purple-400">
                            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                            {entry.diamondBadges} 💎
                          </span>
                        )}
                        {entry.goldBadges > 0 && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {entry.goldBadges} 🥇
                          </span>
                        )}
                        {entry.silverBadges > 0 && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            {entry.silverBadges} 🥈
                          </span>
                        )}
                        {entry.bronzeBadges > 0 && (
                          <span className="flex items-center gap-1 text-orange-400">
                            <span className="w-2 h-2 rounded-full bg-orange-700"></span>
                            {entry.bronzeBadges} 🥉
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-slate-400 mt-1">
                        {entry.languages.join(', ')} • Avg: {Math.round(entry.avgScore)}%
                      </div>
                    </div>
                  </div>

                  {/* Total Badges - Large Display */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-white text-3xl" style={{ color: dominantBadge.color }}>
                      {entry.totalBadges}
                    </p>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Badges</p>
                  </div>
                </div>
              </motion.div>
            );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
