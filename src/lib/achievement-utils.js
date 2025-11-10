/**
 * Achievement and Badge Utility Functions
 * Used for determining badge levels, generating NFT metadata, and token IDs
 */

/**
 * Badge configuration with thresholds and rarity
 */
export const BADGE_CONFIG = {
  Bronze: {
    minScore: 70,
    maxScore: 79,
    rarity: 'Common',
    color: '#CD7F32',
    emoji: '🥉',
  },
  Silver: {
    minScore: 80,
    maxScore: 89,
    rarity: 'Uncommon',
    color: '#C0C0C0',
    emoji: '🥈',
  },
  Gold: {
    minScore: 90,
    maxScore: 97,
    rarity: 'Rare',
    color: '#FFD700',
    emoji: '🥇',
  },
  Diamond: {
    minScore: 98,
    maxScore: 100,
    rarity: 'Legendary',
    color: '#B9F2FF',
    emoji: '💎',
  },
};

/**
 * Determine badge level based on score
 * @param {number} score - Test score (0-100)
 * @returns {string|null} Badge level or null if below threshold
 */
export function determineBadgeLevel(score) {
  if (score < 70) return null; // Below minimum threshold
  
  if (score >= 98) return 'Diamond';
  if (score >= 90) return 'Gold';
  if (score >= 80) return 'Silver';
  if (score >= 70) return 'Bronze';
  
  return null;
}

/**
 * Generate a unique token ID for the achievement
 * @param {string} language - Programming language
 * @param {string} badge - Badge level
 * @returns {string} Token ID
 */
export function generateTokenId(language, badge) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${language.toUpperCase()}_${badge.toUpperCase()}_${timestamp}_${random}`;
}

/**
 * Generate NFT metadata for the achievement
 * @param {Object} params
 * @param {string} params.language - Programming language
 * @param {string} params.badge - Badge level
 * @param {number} params.score - Test score
 * @param {Date} params.timestamp - Achievement timestamp
 * @param {string} [params.challengeTitle] - Optional challenge title
 * @returns {Object} NFT metadata
 */
export function generateNFTMetadata({ language, badge, score, timestamp, challengeTitle }) {
  const config = BADGE_CONFIG[badge];
  
  return {
    name: `${badge} ${language} Badge`,
    description: `Achievement badge for mastering ${language} with a score of ${score}%. ${challengeTitle ? `Challenge: ${challengeTitle}` : ''}`,
    image: `https://riseup.app/badges/${badge.toLowerCase()}-${language.toLowerCase()}.png`,
    attributes: [
      {
        trait_type: 'Language',
        value: language,
      },
      {
        trait_type: 'Badge Level',
        value: badge,
      },
      {
        trait_type: 'Rarity',
        value: config.rarity,
      },
      {
        trait_type: 'Score',
        value: score,
        display_type: 'number',
      },
      {
        trait_type: 'Earned Date',
        value: timestamp.toISOString(),
        display_type: 'date',
      },
    ],
    external_url: 'https://riseup.app',
    animation_url: null,
    background_color: config.color.replace('#', ''),
  };
}

/**
 * Get badge emoji by level
 * @param {string} badge - Badge level
 * @returns {string} Emoji
 */
export function getBadgeEmoji(badge) {
  return BADGE_CONFIG[badge]?.emoji || '🏆';
}

/**
 * Get badge color by level
 * @param {string} badge - Badge level
 * @returns {string} Hex color code
 */
export function getBadgeColor(badge) {
  return BADGE_CONFIG[badge]?.color || '#808080';
}

/**
 * Validate score is within badge range
 * @param {number} score - Test score
 * @param {string} badge - Badge level
 * @returns {boolean} True if score matches badge level
 */
export function validateScoreForBadge(score, badge) {
  const config = BADGE_CONFIG[badge];
  if (!config) return false;
  
  return score >= config.minScore && score <= config.maxScore;
}
