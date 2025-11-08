#!/bin/bash

# 🎖️ Achievement Testing with Authentication
# This script logs in, gets token, then tests achievements

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:3000"
COOKIES_FILE="/tmp/riseup_cookies.txt"

echo -e "${BLUE}🎖️ Achievement System Tester with Auth${NC}"
echo "========================================"
echo ""

# Step 1: Check if app is running
echo -e "${YELLOW}Checking if app is running...${NC}"
if ! curl -s "$API_URL" > /dev/null; then
    echo -e "${RED}❌ App is not running at $API_URL${NC}"
    echo "Please start the app with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ App is running${NC}"
echo ""

# Step 2: Try to login (adjust with your test credentials)
echo -e "${YELLOW}Step 1: Attempting to login...${NC}"
LOGIN_RESPONSE=$(curl -s -c "$COOKIES_FILE" -X POST "$API_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q '"user"'; then
    echo -e "${GREEN}✅ Login successful${NC}"
else
    echo -e "${YELLOW}⚠️  Login endpoint may not exist or credentials invalid${NC}"
    echo "Response: $LOGIN_RESPONSE"
    echo ""
    echo "If you don't have a test account, create one first or use Option 1 (Browser Console)"
    exit 1
fi
echo ""

# Step 3: Test Achievement Creation with Cookies
echo -e "${YELLOW}Step 2: Creating Python Gold Badge (92%)${NC}"
RESPONSE=$(curl -s -b "$COOKIES_FILE" -X POST "$API_URL/api/achievements/unlock" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Python",
    "score": 92,
    "challengeTitle": "Lists"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Achievement created${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ Failed to create achievement${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi
echo ""

# Step 4: Get User Achievements
echo -e "${YELLOW}Step 3: Fetching your achievements${NC}"
RESPONSE=$(curl -s -b "$COOKIES_FILE" "$API_URL/api/achievements/user")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Achievements fetched${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ Failed to fetch achievements${NC}"
    echo "$RESPONSE"
fi
echo ""

# Step 5: Get Leaderboard
echo -e "${YELLOW}Step 4: Fetching leaderboard${NC}"
RESPONSE=$(curl -s -b "$COOKIES_FILE" "$API_URL/api/achievements/leaderboard?limit=10")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Leaderboard fetched${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ Failed to fetch leaderboard${NC}"
    echo "$RESPONSE"
fi
echo ""

# Cleanup
rm -f "$COOKIES_FILE"

echo -e "${BLUE}========================================"
echo "✅ Testing Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open: http://localhost:3000/achievements"
echo "2. Verify you see the achievement card"
echo "3. Test language filtering"
echo "4. Check: http://localhost:3000/leaderboard"
