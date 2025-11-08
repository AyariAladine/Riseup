/**
 * Achievement Badge Logic
 * Determines badge level based on test score
 */

export const BADGE_CONFIG = {
  Bronze: { minScore: 70, rarity: 'Common', color: '#CD7F32', emoji: '🥉' },
  Silver: { minScore: 80, rarity: 'Uncommon', color: '#C0C0C0', emoji: '🥈' },
  Gold: { minScore: 90, rarity: 'Rare', color: '#FFD700', emoji: '🥇' },
  Diamond: { minScore: 100, rarity: 'Legendary', color: '#B9F2FF', emoji: '💎' },
};

export const LANGUAGE_TOKEN_IDS = {
  Python: 1,
  JavaScript: 2,
  TypeScript: 3,
  Java: 4,
  'C++': 5,
  Rust: 6,
  Go: 7,
  Ruby: 8,
};

/**
 * Determine badge level based on score
 * @param {number} score - Test score (0-100)
 * @returns {string|null} Badge type or null if no badge earned
 */
export function determineBadgeLevel(score) {
  if (score === 100) return 'Diamond';
  if (score >= 90) return 'Gold';
  if (score >= 80) return 'Silver';
  if (score >= 70) return 'Bronze';
  return null;
}

/**
 * Generate NFT metadata JSON
 * @param {Object} params - Achievement parameters
 * @returns {Object} Metadata object
 */
export function generateNFTMetadata(params) {
  const { language, badge, score, timestamp, challengeTitle } = params;
  const badgeConfig = BADGE_CONFIG[badge];
  
  return {
    name: `${language} ${badge} Badge`,
    description: `A ${badge} achievement badge earned by scoring ${score}% on a ${language} coding challenge.${challengeTitle ? ` Challenge: ${challengeTitle}` : ''}`,
    image: `https://riseup-badges.s3.amazonaws.com/${language.toLowerCase()}-${badge.toLowerCase()}.png`,
    attributes: [
      { trait_type: 'Language', value: language },
      { trait_type: 'Badge', value: badge },
      { trait_type: 'Rarity', value: badgeConfig.rarity },
      { trait_type: 'Score', value: `${score}%`, display_type: 'number' },
      { trait_type: 'Earned', value: new Date(timestamp).toLocaleDateString(), display_type: 'date' },
    ],
    external_url: `https://riseup.app/achievements`,
  };
}

/**
 * Generate unique NFT token ID combining language and badge
 * @param {string} language - Programming language
 * @param {string} badge - Badge type
 * @returns {number} Token ID
 */
export function generateTokenId(language, badge) {
  const langId = LANGUAGE_TOKEN_IDS[language] || 99;
  const badgeId = Object.keys(BADGE_CONFIG).indexOf(badge) + 1;
  return (langId * 1000) + badgeId;
}

export default {
  BADGE_CONFIG,
  LANGUAGE_TOKEN_IDS,
  determineBadgeLevel,
  generateNFTMetadata,
  generateTokenId,
};
