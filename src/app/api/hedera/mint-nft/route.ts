import 'server-only';
import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getHederaClient, closeHederaClient } from '@/lib/hederaClient';
import { notifyNFTMinted } from '@/lib/notification-helper';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenId,
} from '@hashgraph/sdk';

/**
 * POST /api/hedera/mint-nft
 * 
 * Mints an NFT badge on Hedera for a completed task achievement.
 * 
 * Flow:
 * 1. Create NFT collection (if not exists) - one-time setup
 * 2. Mint unique NFT with task achievement metadata
 * 3. Return token ID, serial number, and transaction hash
 * 
 * Request body:
 * {
 *   taskId: string,
 *   userId: string,
 *   score: number,
 *   badgeTier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond',
 *   badgeRarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary'
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   tokenId: string,
 *   serialNumber: string,
 *   transactionId: string,
 *   metadataUri: string
 * }
 */
export async function POST(req: NextRequest) {
  let hederaClient = null;

  try {
    // No auth check needed here - this endpoint is called from authenticated grade route
    // The grade route already verifies the user
    
    const body = await req.json();
    const { taskId, userId, score, badgeTier, badgeRarity, taskTitle } = body;

    // Validate input
    if (!taskId || !userId || typeof score !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: taskId, userId, score' }),
        { status: 400 }
      );
    }

    // Initialize Hedera client
    hederaClient = getHederaClient();

    console.log('[Hedera NFT] Starting NFT minting process...');
    console.log(`[Hedera NFT] Task: ${taskId} (${taskTitle}), User: ${userId}, Score: ${score}`);

    // Use existing NFT token ID or create new one
    // For production, store this token ID in database after first creation
    let nftTokenId = process.env.HEDERA_NFT_TOKEN_ID;

    if (!nftTokenId) {
      console.log('[Hedera NFT] No existing token found, creating new NFT collection...');
      
      // Create NFT collection (one-time setup)
      const nftCreateTx = new TokenCreateTransaction()
        .setTokenName('RiseUp Task Achievement Badge')
        .setTokenSymbol('RISEUP')
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(hederaClient.operatorAccountId!)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(hederaClient.operatorPublicKey!)
        .freezeWith(hederaClient);

      const nftCreateTxResponse = await nftCreateTx.execute(hederaClient);
      const nftCreateReceipt = await nftCreateTxResponse.getReceipt(hederaClient);
      nftTokenId = nftCreateReceipt.tokenId?.toString();

      console.log(`[Hedera NFT] NFT Collection created: ${nftTokenId}`);
      console.log(`[Hedera NFT] ⚠️  Save this token ID to .env.local as HEDERA_NFT_TOKEN_ID="${nftTokenId}"`);
    }
    
    // Create compact metadata (Hedera has 100-byte limit per NFT)
    // Format: taskId|userId|score|tier (max ~90 bytes)
    const compactMetadata = `${taskId}|${userId}|${score}|${badgeTier}`;
    const metadataBytes = Buffer.from(compactMetadata, 'utf-8');
    
    console.log('[Hedera NFT] Minting NFT with compact metadata:', {
      raw: compactMetadata,
      bytes: metadataBytes.length,
      taskTitle,
      badge: `${badgeTier} (${badgeRarity})`
    });

    // Ensure nftTokenId is defined before minting
    if (!nftTokenId) {
      throw new Error('NFT token ID is required but was not found or created');
    }

    // Mint the NFT
    const mintTx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(nftTokenId))
      .setMetadata([metadataBytes])
      .freezeWith(hederaClient);

    const mintTxResponse = await mintTx.execute(hederaClient);
    const mintReceipt = await mintTxResponse.getReceipt(hederaClient);
    
    const serialNumber = mintReceipt.serials[0]?.toString();
    const transactionId = mintTxResponse.transactionId.toString();

    console.log(`[Hedera NFT] NFT minted successfully!`);
    console.log(`[Hedera NFT] Token ID: ${nftTokenId}`);
    console.log(`[Hedera NFT] Serial Number: ${serialNumber}`);
    console.log(`[Hedera NFT] Transaction: ${transactionId}`);

    // Generate Hedera explorer link
    const explorerUrl = `https://hashscan.io/testnet/token/${nftTokenId}/${serialNumber}`;
    
    // Badge name uses task title with " - Completion" suffix
    const badgeName = `${taskTitle} - Completion`;

    // Send push notification for NFT minting
    try {
      await notifyNFTMinted(userId, badgeName, badgeTier || 'Bronze');
      console.log(`[Hedera NFT] Push notification sent to user ${userId}`);
    } catch (notifError) {
      console.error('[Hedera NFT] Failed to send push notification:', notifError);
      // Don't fail the whole request if notification fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokenId: nftTokenId,
        serialNumber,
        transactionId,
        metadataUri: explorerUrl,
        compactMetadata,
        badgeName,
        badgeTier,
        message: `${badgeName} badge minted successfully!`,
        explorerUrl
      }),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Hedera NFT] Minting failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to mint NFT badge'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } finally {
    if (hederaClient) {
      await closeHederaClient(hederaClient).catch(console.error);
    }
  }
}
