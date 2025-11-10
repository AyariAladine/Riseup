import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { getHederaClient, closeHederaClient } from '@/lib/hederaClient';
import Achievement from '@/models/Achievement';
import User from '@/models/User';
import { determineBadgeLevel, generateNFTMetadata, generateTokenId, BADGE_CONFIG } from '@/lib/achievement-utils';
import { TokenMintTransaction, TokenId } from '@hashgraph/sdk';
import { notifyAchievementUnlocked } from '@/lib/notification-helper';

/**
 * POST /api/achievements/unlock
 * Unlock an achievement badge for a user after test completion
 * 
 * Request body:
 * {
 *   language: string,
 *   score: number (0-100),
 *   challengeTitle?: string,
 *   testId?: string,
 *   walletAddress?: string,
 *   hederaTokenId?: string (optional - for minting on Hedera)
 * }
 * 
 * This route:
 * 1. Validates the user and request data
 * 2. Creates an achievement record in MongoDB
 * 3. (Optional) Mints an NFT on Hedera using the operator account
 */
export async function POST(req) {
  let hederaClient = null;
  
  try {
    await connectToDatabase();
    const { user } = await getUserFromRequest(req);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const body = await req.json();
    const { language, score, challengeTitle, testId, walletAddress, hederaTokenId } = body;

    if (!language || score === undefined || score < 0 || score > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid language or score' }),
        { status: 400 }
      );
    }

    // Determine badge level
    const badge = determineBadgeLevel(score);
    
    if (!badge) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Score below minimum threshold (70%). Keep practicing!' 
        }),
        { status: 200 }
      );
    }

    // Check if user already has this badge type
    const existingAchievement = await Achievement.findOne({
      userId: user._id,
      language,
      badge,
    });

    if (existingAchievement) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `You already earned a ${badge} ${language} badge!`,
          achievement: existingAchievement,
        }),
        { status: 200 }
      );
    }

    // Create NFT metadata
    const tokenId = generateTokenId(language, badge);
    const metadata = generateNFTMetadata({
      language,
      badge,
      score,
      timestamp: new Date(),
      challengeTitle,
    });

    // Store metadata as JSON string for now (will be uploaded to IPFS later)
    const metadataJson = JSON.stringify(metadata);

    // Create achievement record
    const achievement = await Achievement.create({
      userId: user._id,
      language,
      badge,
      rarity: BADGE_CONFIG[badge].rarity,
      score,
      nftTokenId: tokenId.toString(),
      testId,
      challengeTitle,
      network: 'polygon-mumbai',
      chainId: 80001,
      minted: false, // Will be set to true after successful Hedera mint
    });

    // ============================================================
    // HEDERA NFT MINTING (Optional - if hederaTokenId is provided)
    // ============================================================
    let hederaMintResult = null;
    
    if (hederaTokenId) {
      try {
        // Initialize Hedera client with operator account
        hederaClient = getHederaClient();
        
        console.log(`[Hedera] Minting NFT for achievement ${achievement._id}`);
        console.log(`[Hedera] Token ID: ${hederaTokenId}`);
        console.log(`[Hedera] Metadata: ${metadataJson}`);

        // Create mint transaction
        const mintTx = new TokenMintTransaction()
          .setTokenId(TokenId.fromString(hederaTokenId))
          .setMetadata([Buffer.from(metadataJson)])
          .freezeWith(hederaClient);

        // Execute the transaction
        const txResponse = await mintTx.execute(hederaClient);

        // Get the receipt to verify transaction was successful
        const receipt = await txResponse.getReceipt(hederaClient);

        console.log(`[Hedera] Transaction Status: ${receipt.status.toString()}`);
        
        // Store Hedera transaction details
        hederaMintResult = {
          transactionId: txResponse.transactionId.toString(),
          status: receipt.status.toString(),
          success: true,
        };

        // Update achievement with successful mint status
        achievement.minted = true;
        achievement.hederaTransactionId = txResponse.transactionId.toString();
        achievement.hederaStatus = receipt.status.toString();
        await achievement.save();

        console.log(`[Hedera] ✅ NFT minted successfully: ${txResponse.transactionId}`);
      } catch (hederaError) {
        console.error(`[Hedera] ❌ Minting failed: ${hederaError.message}`);
        hederaMintResult = {
          success: false,
          error: hederaError.message,
        };
        // Continue without failing - achievement is still recorded in DB
      } finally {
        // Always close the Hedera client connection
        if (hederaClient) {
          await closeHederaClient(hederaClient);
        }
      }
    }

    // Update user's badge count
    await User.updateOne(
      { _id: user._id },
      { 
        $inc: { totalBadgesEarned: 1 },
        $set: { walletAddress: walletAddress || user.walletAddress }
      }
    );

    // Send achievement notification
    try {
      await notifyAchievementUnlocked(user._id.toString(), `${badge} ${language} Badge`, badge);
    } catch (notifError) {
      console.error('Failed to send achievement notification:', notifError);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `🎉 Congrats! You earned a ${badge} ${language} Badge!`,
        achievement: {
          _id: achievement._id,
          badge: achievement.badge,
          rarity: achievement.rarity,
          language: achievement.language,
          score: achievement.score,
          unlockedAt: achievement.unlockedAt,
          nftTokenId: achievement.nftTokenId,
          minted: achievement.minted,
          hederaTransactionId: achievement.hederaTransactionId,
        },
        metadata,
        hedera: hederaMintResult, // Include Hedera minting result if applicable
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error('Achievement unlock error:', err);
    
    // Ensure Hedera client is closed on error
    if (hederaClient) {
      await closeHederaClient(hederaClient).catch(console.error);
    }
    
    return new Response(
      JSON.stringify({ error: 'Failed to unlock achievement' }),
      { status: 500 }
    );
  }
}
