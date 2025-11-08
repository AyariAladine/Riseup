# Hedera SDK Integration Setup Guide

## 🎯 Overview

This guide documents the Hedera SDK integration for the RiseUp Next.js application. The integration allows the app to:

- ✅ Mint NFTs on Hedera testnet/mainnet
- ✅ Create and manage tokens
- ✅ Perform blockchain transactions on behalf of the operator account
- ✅ Securely authenticate using environment variables

## 📦 Dependencies Installed

```bash
npm install @hashgraph/sdk
```

The Hedera SDK provides TypeScript support and is fully integrated with the backend.

## 🔧 Files Created/Modified

### 1. `/src/lib/hederaClient.ts` (NEW)

Core utility file that exports two functions:

**`getHederaClient(): Client`**
- Initializes a Hedera client for testnet
- Authenticates using `MY_ACCOUNT_ID` and `MY_PRIVATE_KEY` from `.env.local`
- Sets default transaction fee limits
- Returns a ready-to-use client instance

**`closeHederaClient(client: Client): Promise<void>`**
- Properly closes the Hedera client connection
- Should always be called after completing blockchain operations
- Handles errors gracefully

**Security Notes:**
- ⚠️  **NEVER expose the private key on the frontend**
- Only use `getHederaClient()` in server-side code (API routes, backend)
- Environment variables are loaded server-side only

### 2. `/src/app/api/achievements/unlock/route.js` (MODIFIED)

Updated to support Hedera NFT minting:

**New Features:**
- Imports Hedera SDK components
- Accepts optional `hederaTokenId` in request body
- When provided, mints an NFT on Hedera using the operator account
- Stores transaction ID and status in MongoDB
- Returns Hedera transaction details in response

**How it Works:**
```
1. User completes a test and receives a badge
2. Request body includes hederaTokenId (if minting is desired)
3. Achievement is recorded in MongoDB
4. If hederaTokenId provided:
   - Initialize Hedera client
   - Create TokenMintTransaction
   - Execute transaction (operator pays the fee)
   - Store transaction ID and status
5. Return achievement details with Hedera transaction info
```

### 3. `/src/app/api/hedera/create-token/route.ts` (NEW - EXAMPLE)

Example endpoint for creating Hedera tokens:

**Endpoint:** `POST /api/hedera/create-token`

**Request Body:**
```json
{
  "name": "RiseUp Achievement Points",
  "symbol": "RAP",
  "decimals": 0,
  "initialSupply": 1000000
}
```

**Response:**
```json
{
  "success": true,
  "tokenId": "0.0.123456",
  "transactionId": "0.0.5314413@1729696800.123456789",
  "status": "SUCCESS",
  "message": "Token created successfully on Hedera testnet"
}
```

## 🔐 Environment Variables

Located in `.env.local`:

```env
MY_ACCOUNT_ID=0.0.5314413
MY_PRIVATE_KEY=3030020100300706052b8104000a04220420a2ef43b56c6d1e838189de7af176e242710af00da2bb9df132f2b671a482ba2f
```

**What They Do:**
- `MY_ACCOUNT_ID`: Your Hedera account on testnet that acts as the operator/treasury
- `MY_PRIVATE_KEY`: The private key for signing transactions on behalf of your account
- This account will pay the transaction fees for all blockchain operations

**⚠️  Security Checklist:**
- ✅ `.env.local` is in `.gitignore` (not committed to git)
- ✅ Environment variables are only accessible on the server side
- ✅ Private key never appears in frontend code
- ✅ Never log the private key to console in production

## 🧪 Testing the Integration

### Test 1: Unlock an Achievement Without Hedera Minting

```bash
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "language": "JavaScript",
    "score": 85,
    "challengeTitle": "Learn Async/Await"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "🎉 Congrats! You earned a Gold JavaScript Badge!",
  "achievement": {
    "_id": "...",
    "badge": "Gold",
    "language": "JavaScript",
    "score": 85,
    "minted": false
  },
  "hedera": null
}
```

### Test 2: Unlock an Achievement WITH Hedera Minting

First, create a token:

```bash
curl -X POST http://localhost:3000/api/hedera/create-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "RiseUp Badges",
    "symbol": "BADGE",
    "decimals": 0,
    "initialSupply": 10000
  }'
```

Take the returned `tokenId` and use it in the achievement unlock:

```bash
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "language": "Python",
    "score": 92,
    "challengeTitle": "Master List Comprehensions",
    "hederaTokenId": "0.0.123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "🎉 Congrats! You earned a Gold Python Badge!",
  "achievement": {
    "_id": "...",
    "badge": "Gold",
    "language": "Python",
    "score": 92,
    "minted": true,
    "hederaTransactionId": "0.0.5314413@1729696800.123456789"
  },
  "hedera": {
    "transactionId": "0.0.5314413@1729696800.123456789",
    "status": "SUCCESS",
    "success": true
  }
}
```

## 📚 Usage Examples

### Example 1: Mint an NFT in a Custom API Route

```typescript
import { getHederaClient, closeHederaClient } from '@/lib/hederaClient';
import { TokenMintTransaction, TokenId } from '@hashgraph/sdk';

export async function POST(req) {
  let hederaClient = null;

  try {
    hederaClient = getHederaClient();

    const { tokenId, metadata } = await req.json();

    const mintTx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .setMetadata([Buffer.from(JSON.stringify(metadata))])
      .freezeWith(hederaClient);

    const txResponse = await mintTx.execute(hederaClient);
    const receipt = await txResponse.getReceipt(hederaClient);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString(),
      }),
      { status: 200 }
    );
  } finally {
    if (hederaClient) {
      await closeHederaClient(hederaClient);
    }
  }
}
```

### Example 2: Transfer Tokens to a User

```typescript
import { getHederaClient, closeHederaClient } from '@/lib/hederaClient';
import { TransferTransaction, TokenId, AccountId } from '@hashgraph/sdk';

export async function POST(req) {
  let hederaClient = null;

  try {
    hederaClient = getHederaClient();

    const { tokenId, recipientAccountId, amount } = await req.json();

    const transferTx = new TransferTransaction()
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        hederaClient.operatorAccountId, // From operator
        -amount // Negative: sender sends
      )
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(recipientAccountId),
        amount // Positive: recipient receives
      )
      .freezeWith(hederaClient);

    const txResponse = await transferTx.execute(hederaClient);
    const receipt = await txResponse.getReceipt(hederaClient);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Transferred ${amount} tokens to ${recipientAccountId}`,
        transactionId: txResponse.transactionId.toString(),
      }),
      { status: 200 }
    );
  } finally {
    if (hederaClient) {
      await closeHederaClient(hederaClient);
    }
  }
}
```

## 🚀 Switching Between Testnet and Mainnet

To use Hedera mainnet instead of testnet:

**In `/src/lib/hederaClient.ts`, change:**

```typescript
// Current (testnet):
const client = Client.forTestnet();

// To use mainnet:
const client = Client.forMainnet();
```

**Note:** Mainnet requires real HBAR tokens and real account credentials.

## 📋 Hedera Testnet Faucet

To get test HBAR for development:

1. Visit: https://testnet.dragonglass.me/faucet
2. Enter your account ID (e.g., `0.0.5314413`)
3. Claim 100 test HBAR
4. Use these test tokens for development and testing

## 🔍 Monitoring Transactions

View your Hedera transactions on the testnet explorer:

- **Hedera Testnet Explorer:** https://testnet.dragonglass.me/
- **HashScan (Alternative):** https://hashscan.io/testnet

Search by:
- Transaction ID: `0.0.5314413@1729696800.123456789`
- Account ID: `0.0.5314413`
- Token ID: `0.0.123456`

## 🛠️ Troubleshooting

### Issue: "Hedera credentials missing from environment variables"

**Solution:** Ensure `.env.local` contains:
```env
MY_ACCOUNT_ID=0.0.5314413
MY_PRIVATE_KEY=3030020100300706052b8104000a04220420...
```

**Important:** 
- No extra spaces around `=`
- Private key must be hex-encoded
- Restart Next.js dev server after changing `.env.local`

### Issue: "Invalid private key format"

**Solution:** Ensure the private key is in the correct format:
- Should start with `3030020100` (DER-encoded Ed25519 private key)
- Should be a continuous hex string without spaces

### Issue: "Insufficient funds for transaction"

**Solution:** 
- Go to https://testnet.dragonglass.me/faucet
- Claim more test HBAR
- Wait a few seconds for the faucet to process

### Issue: "Transaction timeout"

**Solution:**
- Check your internet connection
- Verify Hedera testnet is operational
- Check transaction on https://testnet.dragonglass.me/

## 📖 API Reference

All Hedera SDK imports are available from `@hashgraph/sdk`:

```typescript
import {
  Client,                    // Main client class
  PrivateKey,                // Private key handling
  AccountId,                 // Account ID parsing
  TokenCreateTransaction,    // Create tokens
  TokenMintTransaction,      // Mint tokens/NFTs
  TransferTransaction,       // Transfer tokens
  TokenId,                   // Token ID handling
  TokenType,                 // Token type enums
  TokenSupplyType,           // Supply type enums
} from '@hashgraph/sdk';
```

For more details, visit: https://docs.hedera.com/hedera/sdks-and-apis/sdks

## 🎓 Next Steps

1. **Test the integration** using the examples above
2. **Create achievement tokens** using `/api/hedera/create-token`
3. **Mint NFTs** when users unlock achievements
4. **Transfer tokens** to users via `/api/hedera/transfer` (create this route)
5. **Monitor transactions** on Hedera explorer
6. **Deploy to production** with mainnet credentials when ready

## 📞 Support

For issues with:
- **Hedera SDK:** https://github.com/hashgraph/hedera-sdk-js
- **Hedera Docs:** https://docs.hedera.com/
- **This integration:** Check the comments in the code files above
