# 🔐 Hedera Credentials Management Guide

## Overview

Your Hedera account credentials have been securely stored for future use. This guide explains how to manage, restore, and use them.

---

## 📋 Your Hedera Account Information

| Field | Value |
|-------|-------|
| **Account ID** | `0.0.5314413` |
| **Network** | Hedera Testnet |
| **Status** | Active & Configured |
| **Backup Location** | `.hedera-credentials-backup` |

---

## 🔑 Stored Credentials

Your credentials are stored in two places for security and convenience:

### 1. **Primary Location: `.env.local`**
```env
MY_ACCOUNT_ID=0.0.5314413
MY_PRIVATE_KEY=3030020100300706052b8104000a04220420a2ef43b56c6d1e838189de7af176e242710af00da2bb9df132f2b671a482ba2f
```

**Status:** ✅ Active (used by the application)  
**Protection:** ✅ In `.gitignore` (never committed to git)  
**Access:** Only available at runtime on your machine

### 2. **Backup Location: `.hedera-credentials-backup`**
```env
HEDERA_ACCOUNT_ID=0.0.5314413
HEDERA_PRIVATE_KEY=3030020100300706052b8104000a04220420a2ef43b56c6d1e838189de7af176e242710af00da2bb9df132f2b671a482ba2f
```

**Status:** ✅ Backed up for reference  
**Protection:** ✅ In `.gitignore` (never committed to git)  
**Purpose:** Quick reference and restore if `.env.local` is lost

---

## ✅ Security Checklist

- ✅ **Never commit to git** - Both files are in `.gitignore`
- ✅ **Server-side only** - Private key never reaches frontend
- ✅ **Local machine only** - Only use on your secure development machine
- ✅ **No public sharing** - Never share these credentials
- ✅ **Backup maintained** - Credentials backed up in `.hedera-credentials-backup`

---

## 🔄 How to Use Your Credentials Next Time

### Method 1: Using Existing `.env.local`
Your credentials are already in `.env.local`. Just run:

```bash
npm run dev
```

The app will automatically load `MY_ACCOUNT_ID` and `MY_PRIVATE_KEY` from `.env.local`.

### Method 2: Restore from Backup
If you lose your `.env.local`, restore it from the backup:

```bash
# View the backup
cat .hedera-credentials-backup

# Copy credentials from backup file to .env.local
# Add these lines to .env.local:
# MY_ACCOUNT_ID=0.0.5314413
# MY_PRIVATE_KEY=3030020100300706052b8104000a04220420a2ef43b56c6d1e838189de7af176e242710af00da2bb9df132f2b671a482ba2f
```

### Method 3: Shell Script to Restore
Create a restore script:

```bash
#!/bin/bash
# restore-hedera-creds.sh

# Extract credentials from backup
ACCOUNT_ID=$(grep "HEDERA_ACCOUNT_ID=" .hedera-credentials-backup | cut -d'=' -f2)
PRIVATE_KEY=$(grep "HEDERA_PRIVATE_KEY=" .hedera-credentials-backup | cut -d'=' -f2)

# Append to .env.local if not already present
if ! grep -q "MY_ACCOUNT_ID" .env.local; then
  echo "MY_ACCOUNT_ID=$ACCOUNT_ID" >> .env.local
fi

if ! grep -q "MY_PRIVATE_KEY" .env.local; then
  echo "MY_PRIVATE_KEY=$PRIVATE_KEY" >> .env.local
fi

echo "✅ Hedera credentials restored to .env.local"
```

Run it:
```bash
chmod +x restore-hedera-creds.sh
./restore-hedera-creds.sh
```

---

## 🧪 Verify Your Credentials Are Loaded

### Option 1: Check Environment Variables
```bash
# These should output your credentials (server-side only)
node -e "console.log('Account:', process.env.MY_ACCOUNT_ID); console.log('Key exists:', !!process.env.MY_PRIVATE_KEY);"
```

### Option 2: Run the Hedera Integration Test
```bash
npm run dev

# In another terminal, test the API:
curl -X POST http://localhost:3000/api/hedera/create-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Token",
    "symbol": "TEST",
    "decimals": 0,
    "initialSupply": 1000
  }'
```

If you get a valid response with a token ID, your credentials are loaded correctly! ✅

### Option 3: Check Application Logs
Start the dev server and look for log messages:
```bash
npm run dev
```

You'll see something like:
```
[Hedera] Creating token...
[Hedera] Name: Test Token, Symbol: TEST, Decimals: 0
[Hedera] Token created successfully!
```

---

## 📚 What Your Credentials Allow

With your Hedera account (`0.0.5314413`), you can:

- ✅ **Mint NFTs** - Create digital badges and achievements
- ✅ **Create Tokens** - Launch custom tokens for your platform
- ✅ **Transfer Assets** - Send tokens to users
- ✅ **Pay Transaction Fees** - The operator account pays for all operations
- ✅ **Testnet Transactions** - All done on testnet (test HBAR only)

---

## 💰 Getting Test HBAR

Your testnet account needs test HBAR to pay for transactions.

### Get Free Test HBAR:
1. Visit: https://testnet.dragonglass.me/faucet
2. Enter your account ID: `0.0.5314413`
3. Click "Claim" to get 100 test HBAR
4. Wait 10-30 seconds for processing

### Check Your Balance:
- **Explorer:** https://testnet.dragonglass.me/accounts/0.0.5314413
- **HashScan:** https://hashscan.io/testnet/account/0.0.5314413

---

## 🔍 Monitor Your Transactions

Your account ID is: `0.0.5314413`

### View on Hedera Explorer:
- **Hedera DragongGlass:** https://testnet.dragonglass.me/accounts/0.0.5314413
- **HashScan:** https://hashscan.io/testnet/account/0.0.5314413

### Example Transaction URLs:
```
# View specific transaction:
https://testnet.dragonglass.me/transactions/{transactionId}

# View all your tokens:
https://testnet.dragonglass.me/accounts/0.0.5314413?tab=tokens
```

---

## 🚀 Common Commands

### Create a Token
```bash
curl -X POST http://localhost:3000/api/hedera/create-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{"name": "My Token", "symbol": "MTK", "decimals": 0, "initialSupply": 1000}'
```

### Unlock Achievement with NFT Minting
```bash
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "language": "Python",
    "score": 90,
    "hederaTokenId": "0.0.123456"
  }'
```

### Check Dev Server is Running
```bash
npm run dev
# Should see: "ready - started server on 0.0.0.0:3000"
```

---

## ⚠️ Important Reminders

### DO ✅
- ✅ Keep credentials in `.env.local`
- ✅ Reference backup file when needed
- ✅ Use credentials only on your machine
- ✅ Run integration tests regularly
- ✅ Check explorer for transaction status

### DON'T ❌
- ❌ Never commit `.env.local` to git
- ❌ Never share your private key
- ❌ Never expose private key on frontend
- ❌ Never log the private key
- ❌ Never share `.hedera-credentials-backup` file

---

## 🔄 Migration Path: Testnet → Mainnet

When ready for production, update your credentials:

**Step 1: Get Mainnet Account**
- Create account on https://hedera.com
- Fund with real HBAR
- Export credentials

**Step 2: Update `.env.local`**
```env
MY_ACCOUNT_ID=0.0.xxxxx  # Your mainnet account
MY_PRIVATE_KEY=xxxxx      # Your mainnet private key
```

**Step 3: Update Code**
In `/src/lib/hederaClient.ts`, change:
```typescript
// FROM:
const client = Client.forTestnet();

// TO:
const client = Client.forMainnet();
```

**Step 4: Update Backup File**
```bash
# Update .hedera-credentials-backup with new mainnet credentials
```

---

## 🆘 Troubleshooting

### Credentials Not Loading?
```bash
# Check if .env.local exists
ls -la .env.local

# Check if variables are set
grep "MY_ACCOUNT_ID\|MY_PRIVATE_KEY" .env.local

# Restart dev server
npm run dev
```

### Getting "Hedera credentials missing" Error?
1. Verify `.env.local` has both variables
2. Restart dev server (Ctrl+C, then `npm run dev`)
3. Check for typos in variable names

### Private Key Format Wrong?
The key should:
- Start with `3030020100`
- Be a continuous hex string (~150+ chars)
- Have NO spaces or line breaks

---

## 📞 Support Resources

- **Hedera Docs:** https://docs.hedera.com/
- **Hedera SDK JS:** https://github.com/hashgraph/hedera-sdk-js
- **Testnet Faucet:** https://testnet.dragonglass.me/faucet
- **Testnet Explorer:** https://testnet.dragonglass.me/

---

## 📝 Credential History

| Date | Event | Account |
|------|-------|---------|
| Oct 23, 2025 | Initial Setup | 0.0.5314413 |
| | Backup Created | .hedera-credentials-backup |
| | Integration Complete | Testnet Active |

---

**✅ Your Hedera credentials are now securely stored and ready for use!**

For detailed integration information, see `HEDERA_INTEGRATION_SUMMARY.md`.
