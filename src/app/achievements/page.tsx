'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import AchievementCard from '@/components/AchievementCard';
import { BADGE_CONFIG } from '@/lib/achievement-utils';
import { Loader2, Trophy, Zap, Target, Filter, SortAsc, Sparkles } from 'lucide-react';

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

interface AchievementData {
  success: boolean;
  totalBadges: number;
  achievements: Achievement[];
  achievementsByLanguage: { [key: string]: Achievement[] };
  userStats: {
    totalBadgesEarned: number;
    walletAddress: string | null;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AchievementsPage() {
  const { data, isLoading, error } = useSWR<AchievementData>('/api/achievements/user', fetcher);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'rarity' | 'score'>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const achievements = data?.achievements || [];
  const achievementsByLanguage = data?.achievementsByLanguage || {};
  const userStats = data?.userStats || {};

  const languages = Object.keys(achievementsByLanguage).sort();
  
  // Filter achievements based on selected language
  let filteredAchievements = selectedLanguage
    ? achievementsByLanguage[selectedLanguage]
    : achievements;

  // Sort achievements based on selected sort option
  filteredAchievements = [...filteredAchievements].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    }
    if (sortBy === 'rarity') {
      const rarityOrder: { [key: string]: number } = {
        'Legendary': 4,
        'Rare': 3,
        'Uncommon': 2,
        'Common': 1,
      };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    }
    if (sortBy === 'score') {
      return b.score - a.score;
    }
    return 0;
  });

  // Calculate badge statistics
  const badgeStats = {
    diamond: achievements.filter((a: Achievement) => a.badge === 'Diamond').length,
    gold: achievements.filter((a: Achievement) => a.badge === 'Gold').length,
    silver: achievements.filter((a: Achievement) => a.badge === 'Silver').length,
    bronze: achievements.filter((a: Achievement) => a.badge === 'Bronze').length,
  };

  // Calculate additional stats
  const totalScore = achievements.reduce((sum, a) => sum + a.score, 0);
  const averageScore = achievements.length > 0 ? Math.round(totalScore / achievements.length) : 0;
  const highestRarity = achievements.length > 0
    ? ['Diamond', 'Gold', 'Silver', 'Bronze'].find(
        (badge) => badgeStats[badge.toLowerCase() as keyof typeof badgeStats] > 0
      ) || 'None'
    : 'None';

  // Find most common language
  const mostCommonLanguage =
    languages.length > 0
      ? languages.reduce((prev, curr) =>
          (achievementsByLanguage[curr].length > achievementsByLanguage[prev].length) ? curr : prev
        )
      : 'N/A';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const statCardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
    hover: { scale: 1.05, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-20">
      {/* Hero Header Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="sticky top-0 z-40 bg-gradient-to-b from-slate-900/95 to-slate-900/50 backdrop-blur-xl border-b border-slate-800/50 px-6 py-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Main Title */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Trophy className="w-10 h-10 text-yellow-400" />
            </motion.div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tight">
                Your Achievements
              </h1>
              <p className="text-slate-400 mt-1">
                {achievements.length === 0
                  ? 'Start coding to earn badges'
                  : `${achievements.length} badge${achievements.length !== 1 ? 's' : ''} earned · Level up your skills`}
              </p>
            </div>
          </motion.div>

          {/* Enhanced Stats Grid */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4"
          >
            {/* Total Badges */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              className="relative p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 group"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <p className="text-xs md:text-sm font-semibold text-blue-300 uppercase tracking-wider mb-1">
                  Total Badges
                </p>
                <p className="text-3xl md:text-4xl font-black text-white">
                  {achievements.length}
                </p>
              </div>
            </motion.div>

            {/* Highest Rarity */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              className="relative p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 group"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <p className="text-xs md:text-sm font-semibold text-purple-300 uppercase tracking-wider mb-1">
                  Top Rarity
                </p>
                <p className="text-3xl md:text-4xl font-black text-white">
                  {highestRarity === 'Diamond' ? '💎' : highestRarity === 'Gold' ? '🥇' : highestRarity === 'Silver' ? '🥈' : '🥉'}
                </p>
              </div>
            </motion.div>

            {/* Average Score */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              className="relative p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 hover:border-green-400/60 transition-all duration-300 group"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <p className="text-xs md:text-sm font-semibold text-green-300 uppercase tracking-wider mb-1">
                  Avg Score
                </p>
                <p className="text-3xl md:text-4xl font-black text-white">
                  {averageScore}%
                </p>
              </div>
            </motion.div>

            {/* Most Used Language */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              className="relative p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/30 hover:border-amber-400/60 transition-all duration-300 group"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <p className="text-xs md:text-sm font-semibold text-amber-300 uppercase tracking-wider mb-1">
                  Top Language
                </p>
                <p className="text-2xl md:text-3xl font-black text-white truncate">
                  {mostCommonLanguage}
                </p>
              </div>
            </motion.div>

            {/* Diamond Count */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              className="relative p-4 rounded-xl bg-gradient-to-br from-cyan-400/10 to-blue-500/10 border border-cyan-400/30 hover:border-cyan-300/60 transition-all duration-300 group"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <p className="text-xs md:text-sm font-semibold text-cyan-300 uppercase tracking-wider mb-1">
                  Legendary
                </p>
                <p className="text-3xl md:text-4xl font-black text-white">
                  {badgeStats.diamond}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-6 py-12"
      >
        {/* Language Filter & Sort Controls */}
        {languages.length > 0 && (
          <motion.div variants={itemVariants} className="mb-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Language Filter */}
              <div className="w-full md:w-auto">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter by Language
                </h2>
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedLanguage(null)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                      selectedLanguage === null
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-slate-800/50 text-slate-300 border border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                    }`}
                  >
                    All ({achievements.length})
                  </motion.button>
                  {languages.map((lang) => (
                    <motion.button
                      key={lang}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                        selectedLanguage === lang
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
                          : 'bg-slate-800/50 text-slate-300 border border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                      }`}
                    >
                      {lang} ({achievementsByLanguage[lang].length})
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="w-full md:w-auto relative">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <SortAsc className="w-4 h-4" />
                  Sort
                </h2>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="w-full md:w-auto px-4 py-2 rounded-lg font-semibold text-sm bg-slate-800/50 text-slate-300 border border-slate-700 hover:border-slate-600 hover:bg-slate-700/50 transition-all duration-300 flex items-center justify-between gap-2"
                >
                  <span>
                    {sortBy === 'recent'
                      ? 'Recently Earned'
                      : sortBy === 'rarity'
                        ? 'Highest Rarity'
                        : 'Highest Score'}
                  </span>
                  <span className={`transition-transform duration-300 ${showSortDropdown ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </motion.button>

                {/* Dropdown Menu */}
                {showSortDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-full md:w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
                  >
                    {[
                      { value: 'recent', label: 'Recently Earned' },
                      { value: 'rarity', label: 'Highest Rarity' },
                      { value: 'score', label: 'Highest Score' },
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ backgroundColor: 'rgba(71, 85, 105, 0.5)' }}
                        onClick={() => {
                          setSortBy(option.value as typeof sortBy);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 font-medium transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg ${
                          sortBy === option.value
                            ? 'bg-blue-600/30 text-blue-300 border-l-2 border-blue-500'
                            : 'text-slate-300 hover:bg-slate-700/30'
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Achievements Grid */}
        {isLoading ? (
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center justify-center py-32"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-12 h-12 text-blue-500" />
            </motion.div>
            <p className="text-slate-400 mt-4 font-medium">Loading your achievements...</p>
          </motion.div>
        ) : error ? (
          <motion.div
            variants={itemVariants}
            className="text-center py-20"
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 inline-block">
              <p className="text-red-400 font-semibold">Failed to load achievements</p>
              <p className="text-red-300/70 text-sm mt-1">Please try refreshing the page</p>
            </div>
          </motion.div>
        ) : filteredAchievements.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="text-center py-32"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-6"
            >
              <Target className="w-20 h-20 mx-auto text-slate-600" />
            </motion.div>
            <p className="text-2xl font-bold text-white mb-2">No achievements yet</p>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Complete AI-generated coding tests and challenges to earn badges and NFT rewards!
            </p>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="/learn"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
            >
              <Zap className="w-5 h-5" />
              Start Learning Now
            </motion.a>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredAchievements.map((achievement: Achievement, index: number) => (
              <AchievementCard
                key={achievement._id}
                achievement={achievement}
                index={index}
              />
            ))}
          </motion.div>
        )}

        {/* Achievement Streak Indicator */}
        {achievements.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="mt-16 pt-8 border-t border-slate-800"
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
                Badge Breakdown
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Diamond', count: badgeStats.diamond, color: 'from-cyan-400 to-blue-500', emoji: '💎' },
                { name: 'Gold', count: badgeStats.gold, color: 'from-yellow-400 to-yellow-600', emoji: '🥇' },
                { name: 'Silver', count: badgeStats.silver, color: 'from-gray-300 to-gray-500', emoji: '🥈' },
                { name: 'Bronze', count: badgeStats.bronze, color: 'from-orange-400 to-orange-600', emoji: '🥉' },
              ].map((badge) => (
                <motion.div
                  key={badge.name}
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-lg bg-gradient-to-br ${badge.color} bg-opacity-10 border border-slate-700 text-center`}
                >
                  <p className="text-2xl mb-2">{badge.emoji}</p>
                  <p className="text-sm text-slate-400">{badge.name}</p>
                  <p className="text-2xl font-bold text-white">{badge.count}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
