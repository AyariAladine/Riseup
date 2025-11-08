# Achievement & NFT Reward System Documentation

## Overview

The Riseup Achievement & NFT Reward System automatically rewards users with achievement badges and NFT tokens when they complete coding tests with high scores. The system is fully integrated with the existing AI grading engine.

## Architecture

### Backend Components

#### 1. **Achievement Model** (`/src/models/Achievement.js`)
Stores achievement data in MongoDB with the following structure:

```javascript
{
  userId: ObjectId,                    // Reference to User
  language: String,                    // Python, JavaScript, TypeScript, etc.
  badge: String,                       // Bronze, Silver, Gold, Diamond
  rarity: String,                      // Common, Uncommon, Rare, Legendary
  score: Number,                       // 0-100
  nftTokenId: String,                  // On-chain token ID
  nftContractAddress: String,          // Smart contract address
  transactionHash: String,             // Blockchain tx hash
  metadataUri: String,                 // IPFS metadata URI
  network: String,                     // polygon-mumbai, sepolia
  chainId: Number,                     // 80001 for Mumbai
  testId: String,                      // Optional test reference
  challengeTitle: String,              // Challenge name
  unlockedAt: Date,                    // Timestamp
  minted: Boolean,                     // NFT minting status
  mintingError: String,                // Error message if minting failed
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **API Routes** (`/src/app/api/achievements/`)

##### `POST /api/achievements/unlock`
Triggered after a test is graded. Determines badge level and creates achievement record.

**Request:**
```json
{
  "language": "Python",
  "score": 92,
  "challengeTitle": "Sum Two Numbers",
  "testId": "test_123",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc126e5d6A81f5"
}
```

**Response (Success - Score ≥ 70%):**
```json
{
  "success": true,
  "message": "🎉 Congrats! You earned a Gold Python Badge!",
  "achievement": {
    "_id": "507f1f77bcf86cd799439011",
    "badge": "Gold",
    "rarity": "Rare",
    "language": "Python",
    "score": 92,
    "unlockedAt": "2025-10-23T15:30:00Z",
    "nftTokenId": "1003"
  },
  "metadata": {
    "name": "Python Gold Badge",
    "description": "A Gold achievement badge earned by scoring 92% on a Python coding challenge.",
    "image": "https://riseup-badges.s3.amazonaws.com/python-gold.png",
    "attributes": [
      {"trait_type": "Language", "value": "Python"},
      {"trait_type": "Badge", "value": "Gold"},
      {"trait_type": "Rarity", "value": "Rare"},
      {"trait_type": "Score", "value": "92%"}
    ]
  }
}
```

**Response (Score < 70%):**
```json
{
  "success": false,
  "message": "Score below minimum threshold (70%). Keep practicing!"
}
```

**Response (Badge Already Exists):**
```json
{
  "success": false,
  "message": "You already earned a Gold Python badge!",
  "achievement": { ... }
}
```

##### `GET /api/achievements/user`
Fetches all achievements for the authenticated user.

**Response:**
```json
{
  "success": true,
  "totalBadges": 8,
  "achievements": [ ... ],
  "achievementsByLanguage": {
    "Python": [ ... ],
    "JavaScript": [ ... ]
  },
  "userStats": {
    "totalBadgesEarned": 8,
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc126e5d6A81f5"
  }
}
```

##### `GET /api/achievements/leaderboard?language=Python&limit=10`
Fetches top achievers with optional language filtering.

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "_id": "507f1f77bcf86cd799439011",
      "totalBadges": 12,
      "totalScore": 1050,
      "avgScore": 87.5,
      "diamondBadges": 3,
      "goldBadges": 6,
      "silverBadges": 2,
      "bronzeBadges": 1,
      "userName": "Alice Johnson",
      "userAvatar": "https://...",
      "languages": ["Python", "JavaScript", "TypeScript"]
    }
  ],
  "language": "Python",
  "count": 10
}
```

### Badge Tier System

Badges are awarded based on test scores:

| Badge | Score | Rarity | Emoji | Color |
|-------|-------|--------|-------|-------|
| Bronze | ≥ 70% | Common | 🥉 | #CD7F32 |
| Silver | ≥ 80% | Uncommon | 🥈 | #C0C0C0 |
| Gold | ≥ 90% | Rare | 🥇 | #FFD700 |
| Diamond | 100% | Legendary | 💎 | #B9F2FF |

### Token ID Generation

Token IDs are generated using the formula: `(languageId * 1000) + badgeId`

**Language IDs:**
- Python: 1
- JavaScript: 2
- TypeScript: 3
- Java: 4
- C++: 5
- Rust: 6
- Go: 7
- Ruby: 8

**Badge IDs:**
- Bronze: 1
- Silver: 2
- Gold: 3
- Diamond: 4

**Example:** Python Gold Badge = (1 × 1000) + 3 = **1003**

## Smart Contract

### `RiseupAchievementNFT.sol`
ERC-1155 contract deployed on Polygon Mumbai testnet.

**Key Features:**
- Mints fractional NFT badges (1155 standard)
- Stores metadata URI pointing to IPFS
- Tracks user badge counts
- Supports batch minting
- Owner-controlled minting (backend service)

**Contract Methods:**

```solidity
// Mint single badge
function mintBadge(
  address to,
  uint256 tokenId,
  uint256 amount,
  string memory language,
  string memory badgeType,
  uint256 score,
  string memory metadataUri
) public onlyOwner

// Check if user has badge
function hasBadge(address user, uint256 tokenId) public view returns (bool)

// Get user's badge count
function getUserBadgeCount(address user, uint256 tokenId) public view returns (uint256)
```

**Deployment Details:**
- **Network:** Polygon Mumbai (Testnet)
- **Chain ID:** 80001
- **Status:** Ready for deployment
- **Base URI:** `https://riseup-achievements.ipfs.io/metadata/`

## Frontend Components

### 1. **AchievementCard** (`/src/components/AchievementCard.tsx`)
Displays a single achievement with glowing animation.

**Props:**
```typescript
interface Props {
  achievement: Achievement;
  index?: number;  // For staggered animation
}
```

### 2. **AchievementUnlockToast** (`/src/components/AchievementUnlockToast.tsx`)
Celebration popup shown when user earns a new badge.

**Props:**
```typescript
interface Props {
  achievement: Achievement;
  onClose: () => void;
}
```

**Features:**
- Animated badge emoji with confetti
- Score progress bar
- Auto-dismisses after 6 seconds
- Customizable colors based on rarity

### 3. **Pages**

#### `/achievements`
Main achievements showcase page featuring:
- Badge statistics (total, diamond, gold, silver)
- Language-based filtering
- Badge grid with animations
- Empty state with call-to-action

#### `/leaderboard`
Global leaderboard showing:
- Top 20 achievers by badge count
- Per-language leaderboards
- Ranking medals (1st, 2nd, 3rd)
- Badge distribution for each user
- Average score statistics

## Integration Guide

### Step 1: Add Achievement Hook to Your Component

```typescript
import { useAchievements } from '@/hooks/useAchievements';

function TestResultsComponent() {
  const { unlockAchievement, isLoading } = useAchievements();
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  const handleTestCompletion = async (language, score, title) => {
    const result = await unlockAchievement({
      language,
      score,
      challengeTitle: title,
      testId: 'test_' + Date.now(),
    });

    if (result?.success && result?.achievement) {
      setUnlockedBadge(result.achievement);
    }
  };

  return (
    <>
      {/* Your test UI */}
      {unlockedBadge && (
        <AchievementUnlockToast
          achievement={unlockedBadge}
          onClose={() => setUnlockedBadge(null)}
        />
      )}
    </>
  );
}
```

### Step 2: Update Your IDE Complete Route

Add achievement check to `/src/app/api/ide/complete/route.js`:

```javascript
// After completing test, call achievement unlock
if (score >= 70) {
  const achievementResult = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/achievements/unlock`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language,
        score: score,
        challengeTitle: title,
      }),
    }
  );
}
```

## NFT Metadata Format

Metadata stored on IPFS follows OpenSea standard:

```json
{
  "name": "Python Gold Badge",
  "description": "A Gold achievement badge earned by scoring 92% on a Python coding challenge.",
  "image": "https://riseup-badges.s3.amazonaws.com/python-gold.png",
  "external_url": "https://riseup.app/achievements",
  "attributes": [
    {
      "trait_type": "Language",
      "value": "Python"
    },
    {
      "trait_type": "Badge",
      "value": "Gold"
    },
    {
      "trait_type": "Rarity",
      "value": "Rare"
    },
    {
      "trait_type": "Score",
      "value": "92%",
      "display_type": "number"
    },
    {
      "trait_type": "Earned",
      "value": "10/23/2025",
      "display_type": "date"
    }
  ]
}
```

## Database Schema

### Achievement Collection
```javascript
achievements: {
  _id: ObjectId,
  userId: ObjectId,  // Index
  language: String,
  badge: String,
  rarity: String,
  score: Number,
  nftTokenId: String,
  nftContractAddress: String,
  transactionHash: String,
  metadataUri: String,
  network: String,
  chainId: Number,
  testId: String,
  challengeTitle: String,
  unlockedAt: Date,  // Index
  minted: Boolean,
  mintingError: String,
  createdAt: Date,
  updatedAt: Date,
  
  // Compound index for preventing duplicates
  unique: {userId, language, badge}
}
```

### User Model Updates
Added to User schema:
```javascript
{
  walletAddress: String,           // User's wallet for NFTs
  nftContractAddress: String,      // Achievement contract address
  totalBadgesEarned: Number        // Counter for quick stats
}
```

## Environment Variables

Add to `.env.local`:

```env
# Blockchain Configuration
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NFT_PRIVATE_KEY=your_private_key_here
NFT_NETWORK=polygon-mumbai

# IPFS Configuration (for metadata storage)
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_API_KEY=your_pinata_secret

# Or use Web3.Storage
WEB3_STORAGE_TOKEN=your_web3_storage_token
```

## Deployment Checklist

- [ ] Deploy smart contract to Polygon Mumbai testnet
- [ ] Update `.env.local` with contract address
- [ ] Test achievement unlock API
- [ ] Verify achievement cards display correctly
- [ ] Test leaderboard aggregation
- [ ] Configure IPFS for metadata storage
- [ ] Set up background job for NFT minting
- [ ] Add event listeners for contract emissions
- [ ] Create badge artwork images (6 × 4 = 24 images needed)
- [ ] Deploy to production

## Future Enhancements

1. **AI-Generated Badge Artwork**
   - Use OpenAI DALL-E or Replicate API
   - Generate unique artwork per language/badge
   - Cache in S3 for performance

2. **NFT Trading**
   - Peer-to-peer badge marketplace
   - Fractional ownership trading

3. **Social Integration**
   - Share achievements on Twitter/LinkedIn
   - Tweet badge unlocked events
   - OpenGraph metadata for sharing

4. **Advanced Leaderboard**
   - Time-based rankings (weekly, monthly)
   - Language-specific competitions
   - Team leaderboards

5. **Badge Collections**
   - "Complete the Python Suite" (get all Python badges)
   - "Polyglot" (earn badges in 5+ languages)
   - Seasonal limited-edition badges

6. **Wallet Integration**
   - RainbowKit for easy wallet connection
   - Wagmi hooks for on-chain interactions
   - Display wallet balance in UI

## Troubleshooting

### Achievement Not Unlocking
- Verify score is ≥ 70%
- Check user is authenticated
- Ensure language name matches exactly
- Check MongoDB connection

### Badge Not Displaying
- Clear browser cache
- Verify achievement record in MongoDB
- Check component props
- Ensure Framer Motion is installed

### Leaderboard Empty
- Verify achievements exist in DB
- Check aggregation pipeline
- Ensure user documents have names
- Run manual aggregation query

## Support

For issues or questions about the Achievement System, check:
1. MongoDB logs for database errors
2. Browser console for frontend errors
3. API response payloads
4. Smart contract events on block explorer

