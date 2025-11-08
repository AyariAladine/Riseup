#!/bin/bash

# Hedera Integration Testing Script
# This script tests the Hedera SDK integration endpoints

set -e

BASE_URL="http://localhost:3000"
JWT_TOKEN="${JWT_TOKEN:-your_jwt_token_here}"

echo "🧪 Hedera Integration Testing"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if the server is running
echo -e "${YELLOW}Test 1: Checking if server is running...${NC}"
if curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running at $BASE_URL${NC}"
    echo "Start the development server with: npm run dev"
    exit 1
fi
echo ""

# Test 2: Create a Hedera token
echo -e "${YELLOW}Test 2: Creating a Hedera token...${NC}"
echo "Endpoint: POST /api/hedera/create-token"
echo "Payload: { name: 'RiseUp Test Token', symbol: 'RTEST', decimals: 0 }"
echo ""

TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/hedera/create-token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "name": "RiseUp Test Token",
    "symbol": "RTEST",
    "decimals": 0,
    "initialSupply": 1000
  }')

echo "Response:"
echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"
echo ""

# Extract tokenId if successful
TOKEN_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.tokenId // empty' 2>/dev/null)

if [ -z "$TOKEN_ID" ]; then
    echo -e "${YELLOW}⚠️  Could not extract tokenId. This may be due to:${NC}"
    echo "  - Missing or invalid JWT token"
    echo "  - MongoDB not connected"
    echo "  - Hedera credentials missing from .env.local"
    echo ""
    echo "Set your JWT token with: export JWT_TOKEN='your_token_here'"
else
    echo -e "${GREEN}✅ Token created: $TOKEN_ID${NC}"
    echo ""
    
    # Test 3: Unlock an achievement with Hedera minting
    echo -e "${YELLOW}Test 3: Unlocking an achievement with Hedera minting...${NC}"
    echo "Endpoint: POST /api/achievements/unlock"
    echo "Payload: { language: 'JavaScript', score: 85, hederaTokenId: '$TOKEN_ID' }"
    echo ""
    
    UNLOCK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/achievements/unlock" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -d "{
        \"language\": \"JavaScript\",
        \"score\": 85,
        \"challengeTitle\": \"Learn Hedera Integration\",
        \"hederaTokenId\": \"$TOKEN_ID\"
      }")
    
    echo "Response:"
    echo "$UNLOCK_RESPONSE" | jq . 2>/dev/null || echo "$UNLOCK_RESPONSE"
    echo ""
    
    # Check if Hedera minting was successful
    HEDERA_SUCCESS=$(echo "$UNLOCK_RESPONSE" | jq -r '.hedera.success // empty' 2>/dev/null)
    
    if [ "$HEDERA_SUCCESS" = "true" ]; then
        echo -e "${GREEN}✅ NFT minted successfully on Hedera!${NC}"
        TRANSACTION_ID=$(echo "$UNLOCK_RESPONSE" | jq -r '.hedera.transactionId' 2>/dev/null)
        echo "   Transaction ID: $TRANSACTION_ID"
        echo "   View on Hedera Testnet Explorer: https://testnet.dragonglass.me/"
    else
        echo -e "${RED}❌ Hedera minting failed${NC}"
    fi
fi

echo ""
echo "=============================="
echo -e "${GREEN}Testing complete!${NC}"
echo ""
echo "📚 Next steps:"
echo "  1. Verify your JWT token is valid"
echo "  2. Ensure MongoDB is running and connected"
echo "  3. Check that .env.local contains valid Hedera credentials"
echo "  4. Visit https://testnet.dragonglass.me/ to view transactions"
echo ""
