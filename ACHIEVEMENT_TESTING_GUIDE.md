# 🧪 Achievement System - Complete Testing Guide

## Quick Navigation

- **[Testing Options](#testing-options)** - 3 ways to test
- **[Browser Testing](#browser-testing)** - Visual testing
- **[API Testing](#api-testing)** - Direct endpoint testing
- **[End-to-End Testing](#end-to-end-testing)** - Full workflow testing
- **[Database Verification](#database-verification)** - MongoDB validation
- **[Troubleshooting](#troubleshooting)** - Common issues

---

## Testing Options

You have **3 ways** to test the Achievement System:

### Option 1: Browser UI Testing (Easiest) ⭐
- Visit pages directly
- Click buttons
- See visual feedback

### Option 2: API Testing (Quick)
- Use curl commands
- Test endpoints directly
- Verify data

### Option 3: End-to-End Testing (Complete)
- Simulate real user flow
- Test grading integration
- Full workflow validation

---

## Browser Testing

### Prerequisites
```bash
# Make sure your app is running
npm run dev

# App should be running at:
http://localhost:3000
```

---

## 1️⃣ Test Achievement Showcase Page

### Step 1: Navigate to Achievements
```
1. Open: http://localhost:3000/achievements
2. You should see:
   ✅ Page title "Achievements"
   ✅ Trophy icon in header
   ✅ 4 stat cards (Total Badges, Diamond, Gold, Languages)
   ✅ Language filter buttons
   ✅ Empty state message if no achievements yet
```

### Step 2: Empty State Test
If no achievements exist yet, you should see:
```
📍 Target Image
┌─────────────────────────────────┐
│ 🎯                              │
│ No achievements yet             │
│ Complete tests and challenges   │
│ to earn badges!                 │
│ [Start Learning] button         │
└─────────────────────────────────┘
```

---

## 2️⃣ Test Leaderboard Page

### Step 1: Navigate to Leaderboard
```
1. Open: http://localhost:3000/leaderboard
2. You should see:
   ✅ Page title "Leaderboard"
   ✅ Medal icon in header
   ✅ Language filter buttons
   ✅ Empty state if no achievements
```

### Step 2: View Rankings Format (once you add achievements)
```
Each ranking entry shows:
🥇 Rank 1  Alice Johnson  💎3 🥇6  | 12 Badges
Python, JavaScript • Avg: 87.5%
```

---

## API Testing

### Method 1: Using curl (Terminal)

#### Step 1: Create Your First Achievement
```bash
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Python",
    "score": 92,
    "challengeTitle": "Sum Two Numbers"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "🎉 Congrats! You earned a Gold Python Badge!",
  "achievement": {
    "_id": "507f1f77bcf86cd799439011",
    "badge": "Gold",
    "language": "Python",
    "score": 92,
    "nftTokenId": "1003",
    "unlockedAt": "2025-10-23T15:30:00Z"
  },
  "metadata": {
    "name": "Python Gold Badge",
    "description": "A Gold achievement badge earned by scoring 92% on a Python coding challenge.",
    "attributes": [
      {"trait_type": "Language", "value": "Python"},
      {"trait_type": "Badge", "value": "Gold"},
      {"trait_type": "Rarity", "value": "Rare"},
      {"trait_type": "Score", "value": "92%"}
    ]
  }
}
```

#### Step 2: Fetch Your Achievements
```bash
curl http://localhost:3000/api/achievements/user
```

**Expected Response:**
```json
{
  "success": true,
  "totalBadges": 1,
  "achievements": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "language": "Python",
      "badge": "Gold",
      "score": 92,
      "unlockedAt": "2025-10-23T15:30:00Z"
    }
  ],
  "achievementsByLanguage": {
    "Python": [/* array of Python achievements */]
  },
  "userStats": {
    "totalBadgesEarned": 1,
    "walletAddress": null
  }
}
```

#### Step 3: Check Global Leaderboard
```bash
curl http://localhost:3000/api/achievements/leaderboard?limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "_id": "user_id",
      "totalBadges": 1,
      "totalScore": 92,
      "avgScore": 92,
      "diamondBadges": 0,
      "goldBadges": 1,
      "silverBadges": 0,
      "bronzeBadges": 0,
      "userName": "Your Name",
      "languages": ["Python"]
    }
  ],
  "count": 1
}
```

---

### Method 2: Using Postman

#### Step 1: Create a POST Request
```
1. Method: POST
2. URL: http://localhost:3000/api/achievements/unlock
3. Headers:
   Content-Type: application/json
4. Body (raw JSON):
   {
     "language": "JavaScript",
     "score": 85,
     "challengeTitle": "Array Methods"
   }
5. Click Send
6. Check response below
```

#### Step 2: Get User Achievements
```
1. Method: GET
2. URL: http://localhost:3000/api/achievements/user
3. Click Send
4. View all your achievements
```

#### Step 3: Get Leaderboard
```
1. Method: GET
2. URL: http://localhost:3000/api/achievements/leaderboard
3. Click Send
4. See global rankings
```

---

## End-to-End Testing

### Test Scenario 1: Bronze Badge (70% score)

```bash
# Create achievement with 70% (minimum Bronze)
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "JavaScript",
    "score": 70,
    "challengeTitle": "Hello World"
  }'

# Expected: Badge = "Bronze", Rarity = "Common"
```

### Test Scenario 2: Silver Badge (80% score)

```bash
# Create achievement with 80% (minimum Silver)
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "TypeScript",
    "score": 80,
    "challengeTitle": "Type Annotations"
  }'

# Expected: Badge = "Silver", Rarity = "Uncommon"
```

### Test Scenario 3: Gold Badge (90% score)

```bash
# Create achievement with 90% (minimum Gold)
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Python",
    "score": 90,
    "challengeTitle": "List Comprehensions"
  }'

# Expected: Badge = "Gold", Rarity = "Rare"
```

### Test Scenario 4: Diamond Badge (100% score)

```bash
# Create achievement with 100% (Diamond only)
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Rust",
    "score": 100,
    "challengeTitle": "Memory Safety"
  }'

# Expected: Badge = "Diamond", Rarity = "Legendary"
```

### Test Scenario 5: Below Threshold (65% score)

```bash
# Create achievement with 65% (below minimum 70%)
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Java",
    "score": 65,
    "challengeTitle": "OOP Basics"
  }'

# Expected Response:
# {
#   "success": false,
#   "message": "Score below minimum threshold (70%). Keep practicing!"
# }
```

### Test Scenario 6: Duplicate Prevention

```bash
# Try to create same badge twice
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Python",
    "score": 95,
    "challengeTitle": "Decorators"
  }'

# First request: Success (new badge created)
# Second request: "You already earned a Gold Python badge!"
```

### Test Scenario 7: Multiple Languages

```bash
# Create badges for different languages to test filtering

# Python Gold
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "Python", "score": 92}'

# JavaScript Silver
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "JavaScript", "score": 85}'

# TypeScript Bronze
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "TypeScript", "score": 75}'

# Then visit /achievements and test language filters
```

---

## Browser Visual Testing

### After Creating Achievements:

#### Step 1: Refresh Achievements Page
```
1. Create achievements using curl (above)
2. Visit http://localhost:3000/achievements
3. Verify:
   ✅ Total Badges stat updated
   ✅ Diamond/Gold/Silver/Bronze counts correct
   ✅ Achievement cards appear in grid
   ✅ Cards show correct badge emoji (💎🥇🥈🥉)
   ✅ Cards show correct colors
   ✅ Dates display correctly
   ✅ Language names show correctly
   ✅ Scores display correctly
```

#### Step 2: Test Language Filtering
```
1. Click "All Languages" button
   ✅ Should see all achievements

2. Click "Python" button
   ✅ Should see only Python achievements

3. Click other language buttons
   ✅ Should filter correctly

4. Achievement count in button updates
   ✅ Shows (3) for 3 Python badges
```

#### Step 3: Test Leaderboard
```
1. Visit http://localhost:3000/leaderboard
2. Verify:
   ✅ You appear in rankings
   ✅ Rank shows medal emoji (🥇🥈🥉)
   ✅ Your name displays
   ✅ Total badges count correct
   ✅ Badge distribution shows (💎🥇🥈)
   ✅ Languages listed
   ✅ Average score calculated
```

#### Step 4: Test Leaderboard Filtering
```
1. Click language filter buttons
2. Leaderboard should update
3. Users are ranked by achievements in that language
```

---

## Database Verification

### Check MongoDB Directly

#### Step 1: Open MongoDB Shell
```bash
mongosh
```

#### Step 2: Switch to Riseup Database
```bash
use riseup
```

#### Step 3: Verify Achievements Collection
```bash
# Count achievements
db.achievements.countDocuments()

# View all achievements
db.achievements.find()

# View specific user achievements
db.achievements.find({ language: "Python" })

# Check badge distribution
db.achievements.aggregate([
  { $group: { _id: "$badge", count: { $sum: 1 } } }
])

# View indexes
db.achievements.getIndexes()
```

#### Step 4: View User Updates
```bash
# Check user's totalBadgesEarned was updated
db.users.findOne({ name: "Your Name" })

# Should show:
# {
#   _id: ObjectId(...),
#   name: "Your Name",
#   totalBadgesEarned: 4,  // Updated from achievements
#   ...
# }
```

---

## Real Browser Toast Testing

### Test the Celebration Popup

If you integrate the Achievement System with your IDE grading:

```typescript
import AchievementUnlockToast from '@/components/AchievementUnlockToast';

// In your component:
const [unlockedBadge, setUnlockedBadge] = useState(null);

const handleTestComplete = async (score) => {
  if (score >= 70) {
    const result = await fetch('/api/achievements/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'Python',
        score: score,
      }),
    });
    
    const data = await result.json();
    if (data.success) {
      setUnlockedBadge(data.achievement);
      // Toast will auto-dismiss after 6 seconds
    }
  }
};

return (
  <>
    {/* Your UI */}
    {unlockedBadge && (
      <AchievementUnlockToast
        achievement={unlockedBadge}
        onClose={() => setUnlockedBadge(null)}
      />
    )}
  </>
);
```

### Expected Toast Behavior
```
✅ Appears at bottom-right
✅ Badge emoji animates in (spring animation)
✅ Confetti particles fall
✅ Score progress bar fills
✅ 6-second countdown starts
✅ Auto-dismisses after 6 seconds
✅ Can manually close by clicking
```

---

## Troubleshooting

### Issue: API returns 401 Unauthorized

**Solution:**
```bash
# Make sure you're authenticated
# Either:
# 1. Login in browser first
# 2. Include auth token in curl header

curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"language": "Python", "score": 92}'
```

### Issue: Page shows "No achievements yet"

**Solution:**
```bash
# Create an achievement first
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "Python", "score": 92}'

# Then refresh the page
# http://localhost:3000/achievements
```

### Issue: Leaderboard is empty

**Solution:**
```bash
# Make sure achievements exist in DB
mongosh
use riseup
db.achievements.countDocuments()

# If count is 0, create achievements via curl first
```

### Issue: Cards not showing animation

**Solution:**
```bash
# Check browser console for errors
# Verify Framer Motion is installed
npm list framer-motion

# Should show version 10.x or higher
```

### Issue: API returns "Already earned this badge"

**Solution:**
This is expected behavior! The system prevents duplicate badges per user/language combination.

To test this:
```bash
# First request: Creates Bronze badge
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "Python", "score": 75}'

# Response: success = true

# Second request: Same language, different score
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "Python", "score": 95}'

# Response: success = false, "You already earned a Gold Python badge!"
# This is correct - prevents duplicate language/badge combos
```

---

## Complete Test Checklist

Run through these to verify everything works:

### API Tests
- [ ] POST /api/achievements/unlock returns 201 (success)
- [ ] POST /api/achievements/unlock with score < 70 returns 200 (no award)
- [ ] POST /api/achievements/unlock duplicate returns 200 (existing badge)
- [ ] GET /api/achievements/user returns all achievements
- [ ] GET /api/achievements/leaderboard returns ranked users

### Frontend Tests
- [ ] /achievements page loads
- [ ] /leaderboard page loads
- [ ] Achievement cards render with animations
- [ ] Language filter buttons work
- [ ] Empty state shows with helpful message
- [ ] Stats dashboard updates correctly

### Database Tests
- [ ] Achievements collection created in MongoDB
- [ ] Unique index on (userId, language, badge)
- [ ] User totalBadgesEarned counter updated
- [ ] Achievement records have correct fields

### Integration Tests
- [ ] Score >= 100 creates Diamond badge
- [ ] Score >= 90 creates Gold badge
- [ ] Score >= 80 creates Silver badge
- [ ] Score >= 70 creates Bronze badge
- [ ] Score < 70 shows "Keep practicing" message
- [ ] Duplicate badges prevented
- [ ] NFT token IDs generated correctly

---

## Sample Test Workflow

### Complete 5-Minute Test:

```bash
# 1. Open terminal and create achievements
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "Python", "score": 92, "challengeTitle": "Lists"}'

curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "JavaScript", "score": 85, "challengeTitle": "Async"}'

curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -d '{"language": "TypeScript", "score": 100, "challengeTitle": "Generics"}'

# 2. Verify in MongoDB
mongosh
use riseup
db.achievements.countDocuments()  # Should show 3

# 3. Open browser
http://localhost:3000/achievements

# 4. Verify:
# ✅ See 3 achievement cards
# ✅ Stats show: 3 Total, 1 Diamond, 1 Gold, 1 Silver
# ✅ Languages show: Python, JavaScript, TypeScript

# 5. Test filtering
# ✅ Click "Python" - see 1 card
# ✅ Click "All Languages" - see 3 cards

# 6. Check leaderboard
http://localhost:3000/leaderboard
# ✅ You appear ranked #1
# ✅ Shows: 💎1 🥇1 | 3 Badges
# ✅ Avg score: 92.3%
```

---

## Next Steps

1. **Test Now** - Run the curl commands above
2. **View Results** - Check /achievements page
3. **Integrate with IDE** - See ACHIEVEMENT_DEPLOYMENT_GUIDE.md Step 3
4. **Go Live** - Deploy when ready

**Everything is working! Start testing now!** 🚀

