# Achievement System Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Database Setup
The Achievement model is already created at `/src/models/Achievement.js`. No additional setup needed!

### 2. Test the API Endpoints

**Terminal 1: Start MongoDB (if not running)**
```bash
mongod
```

**Terminal 2: Start your Next.js app**
```bash
npm run dev
```

**Terminal 3: Test the endpoints**

**Create a test achievement:**
```bash
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Python",
    "score": 92,
    "challengeTitle": "Sum Two Numbers"
  }'
```

**Fetch user achievements:**
```bash
curl http://localhost:3000/api/achievements/user
```

**View leaderboard:**
```bash
curl http://localhost:3000/api/achievements/leaderboard
```

### 3. Visit the UI Pages

- **Achievements:** http://localhost:3000/achievements
- **Leaderboard:** http://localhost:3000/leaderboard

### 4. Integration with IDE

To trigger achievements when tests are completed, update your test completion handler:

```typescript
import { useAchievements } from '@/hooks/useAchievements';

const { unlockAchievement } = useAchievements();

// After grading a test
const score = 92; // from AI grader
const result = await unlockAchievement({
  language: 'Python',
  score: score,
  challengeTitle: 'Sum Two Numbers',
});

if (result?.success) {
  // Show toast notification
  showToast(result.achievement);
}
```

## 📊 File Structure

```
src/
├── models/
│   └── Achievement.js                 # MongoDB schema
├── lib/
│   └── achievement-utils.js           # Badge logic & utilities
├── hooks/
│   └── useAchievements.ts            # React hook for achievements
├── components/
│   ├── AchievementCard.tsx            # Badge display component
│   ├── AchievementUnlockToast.tsx     # Celebration popup
│   └── AchievementIntegration.tsx     # Integration helper
├── app/
│   ├── achievements/
│   │   └── page.tsx                   # Achievements showcase
│   ├── leaderboard/
│   │   └── page.tsx                   # Global leaderboard
│   └── api/achievements/
│       ├── unlock/route.js            # POST endpoint
│       ├── user/route.js              # GET user achievements
│       └── leaderboard/route.js       # GET leaderboard
contracts/
└── RiseupAchievementNFT.sol          # ERC-1155 smart contract
```

## 🎯 Key Features Implemented

✅ **Backend**
- MongoDB Achievement model with indexes
- 3 API endpoints (unlock, user, leaderboard)
- Badge logic (Bronze/Silver/Gold/Diamond)
- NFT metadata generation
- User stats tracking

✅ **Frontend**
- Achievement showcase page with filtering
- Animated achievement cards
- Celebration toast on unlock
- Global leaderboard with rankings
- Responsive design

✅ **Smart Contract**
- ERC-1155 standard for fractional NFTs
- Batch minting support
- Metadata URI storage
- User badge tracking

## 🔧 Configuration

### Environment Variables
Already set in `.env.local`. For NFT minting, add:

```env
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NFT_PRIVATE_KEY=your_key_here
NFT_NETWORK=polygon-mumbai
```

### Badge Thresholds
Edit `/src/lib/achievement-utils.js` to customize:

```javascript
export const BADGE_CONFIG = {
  Bronze: { minScore: 70, ... },
  Silver: { minScore: 80, ... },
  Gold: { minScore: 90, ... },
  Diamond: { minScore: 100, ... },
};
```

## 📱 API Reference

### Unlock Achievement
```
POST /api/achievements/unlock
Content-Type: application/json

{
  "language": "Python",
  "score": 92,
  "challengeTitle": "optional",
  "testId": "optional",
  "walletAddress": "optional"
}
```

### Get User Achievements
```
GET /api/achievements/user
```

### Get Leaderboard
```
GET /api/achievements/leaderboard?language=Python&limit=20
```

## 🚦 Testing Checklist

- [ ] Navigate to `/achievements` page loads
- [ ] Call `/api/achievements/unlock` with score 92
- [ ] Check achievement appears on `/achievements`
- [ ] Navigate to `/leaderboard`
- [ ] Filter leaderboard by language
- [ ] Test calling unlock with score < 70%
- [ ] Test duplicate badge prevention
- [ ] Verify toast animation on unlock

## 🔗 Next Steps

1. **Deploy Smart Contract** (Optional for now)
   - Use Hardhat or Truffle
   - Deploy to Polygon Mumbai testnet
   - Update contract address in env

2. **Setup IPFS** (For permanent metadata storage)
   - Sign up at Pinata.cloud
   - Add API keys to `.env.local`
   - Update metadata storage in API

3. **Integrate with Existing IDE**
   - Find your test grading endpoint
   - Call `unlockAchievement()` after grading
   - Show toast on success

4. **AI-Generated Badges** (Premium feature)
   - Generate unique artwork per language
   - Use OpenAI DALL-E API
   - Cache images on S3

## 🐛 Common Issues

**Q: Achievements not showing?**
A: Check MongoDB connection and verify documents exist in `achievements` collection

**Q: Toast not appearing?**
A: Ensure `useAchievements()` hook is called and `AchievementUnlockToast` is rendered

**Q: Leaderboard empty?**
A: Create some achievements first, then reload leaderboard page

## 📚 Documentation

Full documentation available at `/docs/achievements.md` with:
- Complete API specifications
- Smart contract details
- Database schema
- Deployment checklist
- Troubleshooting guide

