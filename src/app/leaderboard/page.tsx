'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { Loader2, Medal, Users, Trophy, Target, Clock, TrendingUp, Award, Code, Zap, BarChart3 } from 'lucide-react';

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

interface UserStats {
  success: boolean;
  stats: {
    totalBadges: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    avgScore: number;
    bestScore: number;
    skillLevel: number;
    approximateRank: number;
    badgeBreakdown: {
      diamond: number;
      gold: number;
      silver: number;
      bronze: number;
    };
    languages: number;
    languageStats: Array<{
      language: string;
      badges: number;
      avgScore: number;
      bestBadge: string | null;
    }>;
    totalTimeSpent: number;
    totalQuizzes: number;
    uniqueDays: number;
    recentActivity: {
      tasks: number;
      achievements: number;
    };
    totalInteractions: number;
    totalAttempts: number;
  };
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function LeaderboardPage() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const { data, isLoading, error } = useSWR<LeaderboardData>(
    selectedLanguage
      ? `/api/achievements/leaderboard?language=${selectedLanguage}&limit=20`
      : `/api/achievements/leaderboard?limit=20`,
    fetcher
  );

  const { data: userStatsData, isLoading: statsLoading, error: statsError } = useSWR<UserStats>(
    '/api/stats/user',
    fetcher
  );

  const leaderboard = data?.leaderboard || [];
  const userStats = userStatsData?.stats;

  // Debug logging
  console.log('Stats Debug:', { 
    userStatsData, 
    userStats, 
    statsLoading, 
    statsError,
    hasStats: !!userStats 
  });
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
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
        duration: 0.3
      }
    },
    hover: {
      scale: 1.02,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20
      }
    }
  };

  const statCardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.1,
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    }),
    hover: {
      scale: 1.05,
      y: -5,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 25
      }
    }
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
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className={`p-6 rounded-lg bg-gradient-to-r ${getRankColor(
                  entry.rank
                )} bg-opacity-10 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer`}
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

        {/* User Stats Section - Always show, even if empty */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-12"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-white">Your Statistics</h2>
            </div>
            <p className="text-slate-400 text-sm">Track your progress and achievements</p>
          </motion.div>

          {/* Show stats if available */}
          {userStats && (
            <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Badges */}
              <motion.div
                variants={statCardVariants}
                custom={0}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <Trophy className="w-8 h-8 text-purple-400" />
                  <span className="text-3xl font-bold text-purple-300">{userStats?.totalBadges ?? 0}</span>
                </div>
                <p className="text-sm text-slate-300 font-medium">Total Badges</p>
                <div className="mt-2 flex gap-2 text-xs">
                  {(userStats?.badgeBreakdown?.diamond ?? 0) > 0 && (
                    <span className="text-purple-400">💎 {userStats?.badgeBreakdown?.diamond ?? 0}</span>
                  )}
                  {(userStats?.badgeBreakdown?.gold ?? 0) > 0 && (
                    <span className="text-amber-400">🥇 {userStats?.badgeBreakdown?.gold ?? 0}</span>
                  )}
                  {(userStats?.badgeBreakdown?.silver ?? 0) > 0 && (
                    <span className="text-gray-400">🥈 {userStats?.badgeBreakdown?.silver ?? 0}</span>
                  )}
                  {(userStats?.badgeBreakdown?.bronze ?? 0) > 0 && (
                    <span className="text-orange-400">🥉 {userStats?.badgeBreakdown?.bronze ?? 0}</span>
                  )}
                </div>
              </motion.div>

              {/* Skill Level */}
              <motion.div
                variants={statCardVariants}
                custom={1}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-6 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <Zap className="w-8 h-8 text-blue-400" />
                  <span className="text-3xl font-bold text-blue-300">{userStats?.skillLevel ?? 1}/10</span>
                </div>
                <p className="text-sm text-slate-300 font-medium">Skill Level</p>
                <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((userStats?.skillLevel ?? 1) / 10) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                  />
                </div>
              </motion.div>

              {/* Average Score */}
              <motion.div
                variants={statCardVariants}
                custom={2}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <Target className="w-8 h-8 text-green-400" />
                  <span className="text-3xl font-bold text-green-300">{userStats?.avgScore ?? 0}%</span>
                </div>
                <p className="text-sm text-slate-300 font-medium">Average Score</p>
                <p className="text-xs text-slate-400 mt-1">Best: {userStats?.bestScore ?? 0}%</p>
              </motion.div>

              {/* Completion Rate */}
              <motion.div
                variants={statCardVariants}
                custom={3}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-6 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-orange-400" />
                  <span className="text-3xl font-bold text-orange-300">{userStats?.completionRate ?? 0}%</span>
                </div>
                <p className="text-sm text-slate-300 font-medium">Completion Rate</p>
                <p className="text-xs text-slate-400 mt-1">{userStats?.completedTasks ?? 0}/{userStats?.totalTasks ?? 0} tasks</p>
              </motion.div>
            </div>

            {/* Detailed Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Languages */}
              <motion.div
                variants={statCardVariants}
                custom={4}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Code className="w-6 h-6 text-indigo-400" />
                  <div>
                    <p className="text-2xl font-bold text-indigo-300">{userStats?.languages ?? 0}</p>
                    <p className="text-sm text-slate-300 font-medium">Languages</p>
                  </div>
                </div>
                {(userStats?.languageStats?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {(userStats?.languageStats ?? []).slice(0, 3).map((lang, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{lang.language}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-400">{lang.badges} badges</span>
                          {lang.bestBadge && (
                            <span className="text-xs px-2 py-0.5 rounded" style={{
                              backgroundColor: lang.bestBadge === 'Diamond' ? '#9333ea20' :
                                              lang.bestBadge === 'Gold' ? '#f59e0b20' :
                                              lang.bestBadge === 'Silver' ? '#6b728020' : '#cd7f3220',
                              color: lang.bestBadge === 'Diamond' ? '#9333ea' :
                                     lang.bestBadge === 'Gold' ? '#f59e0b' :
                                     lang.bestBadge === 'Silver' ? '#6b7280' : '#cd7f32'
                            }}>
                              {lang.bestBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Activity */}
              <motion.div
                variants={statCardVariants}
                custom={5}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-6 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-pink-400" />
                  <div>
                    <p className="text-2xl font-bold text-pink-300">{userStats?.totalTimeSpent ?? 0}h</p>
                    <p className="text-sm text-slate-300 font-medium">Time Spent</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Days:</span>
                    <span className="text-pink-300 font-medium">{userStats?.uniqueDays ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quizzes Taken:</span>
                    <span className="text-pink-300 font-medium">{userStats?.totalQuizzes ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Attempts:</span>
                    <span className="text-pink-300 font-medium">{userStats?.totalAttempts ?? 0}</span>
                  </div>
                </div>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                variants={statCardVariants}
                custom={6}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-cyan-400" />
                  <div>
                    <p className="text-2xl font-bold text-cyan-300">Last 7 Days</p>
                    <p className="text-sm text-slate-300 font-medium">Recent Activity</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tasks Completed:</span>
                    <span className="text-cyan-300 font-medium">{userStats?.recentActivity?.tasks ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Achievements:</span>
                    <span className="text-cyan-300 font-medium">{userStats?.recentActivity?.achievements ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Approx. Rank:</span>
                    <span className="text-cyan-300 font-medium">#{userStats?.approximateRank ?? 'N/A'}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Language Breakdown Chart */}
            {(userStats?.languageStats?.length ?? 0) > 0 && (
              <motion.div
                variants={statCardVariants}
                custom={7}
                initial="hidden"
                animate="visible"
                className="p-6 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 backdrop-blur-sm"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-400" />
                  Language Breakdown
                </h3>
                <div className="space-y-3">
                  {(userStats?.languageStats ?? []).map((lang, idx) => {
                    const maxBadges = Math.max(...(userStats?.languageStats ?? []).map(l => l.badges), 1);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-300 font-medium">{lang.language}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{lang.avgScore}% avg</span>
                            <span className="text-blue-400 font-bold">{lang.badges} badges</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(lang.badges / maxBadges) * 100}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
            </>
          )}

          {/* Show message if no stats yet */}
          {!userStats && !statsLoading && !statsError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-center"
            >
              <p className="text-slate-400 text-sm">
                Complete tasks and quizzes to see your statistics here!
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Error State for Stats */}
        {statsError && !statsLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 p-6 rounded-xl bg-red-500/10 border border-red-500/30"
          >
            <p className="text-red-400 text-sm">
              Failed to load statistics. Please refresh the page or try again later.
            </p>
          </motion.div>
        )}

        {/* Loading State for Stats - Only show if stats section is not visible */}
        {statsLoading && !userStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 flex items-center justify-center py-12"
          >
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-3 text-slate-400">Loading your statistics...</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
