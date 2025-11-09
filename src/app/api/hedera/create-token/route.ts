import 'server-only';
import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getHederaClient, closeHederaClient } from '@/lib/hederaClient';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
} from '@hashgraph/sdk';

/**
 * POST /api/hedera/create-token
 * 
 * Creates a new Hedera Fungible Token using the operator account.
 * This is an example endpoint for managing Hedera tokens.
 * 
 * Request body:
 * {
 *   name: string,           // Token name (e.g., "RiseUp Achievement Points")
 *   symbol: string,         // Token symbol (e.g., "RAP")
 *   decimals: number,       // Number of decimals (0-8)
 *   initialSupply: number,  // Initial supply amount
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   tokenId: string,        // The created Hedera token ID
 *   transactionId: string,  // The transaction that created it
 *   status: string,         // Transaction status
 * }
 * 
 * ⚠️  SECURITY: This endpoint is restricted to authenticated users.
 * In production, consider adding admin-only checks.
 */
export async function POST(req: NextRequest) {
  let hederaClient = null;

  try {
    // Verify user is authenticated
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, symbol, decimals = 0, initialSupply = 1000000 } = body;

    // Validate input
    if (!name || !symbol) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name and symbol' }),
        { status: 400 }
      );
    }

    if (decimals < 0 || decimals > 8) {
      return new Response(
        JSON.stringify({ error: 'Decimals must be between 0 and 8' }),
        { status: 400 }
      );
    }

    // Initialize Hedera client
    hederaClient = getHederaClient();

    console.log('[Hedera] Creating token...');
    console.log(`[Hedera] Name: ${name}, Symbol: ${symbol}, Decimals: ${decimals}`);

    // Create token transaction
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(initialSupply * 10) // Allow minting up to 10x initial supply
      .setTreasuryAccountId(hederaClient.operatorAccountId!)
      .freezeWith(hederaClient);

    // Execute the transaction
    const txResponse = await tokenCreateTx.execute(hederaClient);

    // Get the receipt to verify successful creation
    const receipt = await txResponse.getReceipt(hederaClient);

    console.log(`[Hedera] Token created successfully!`);
    console.log(`[Hedera] Token ID: ${receipt.tokenId}`);

    return new Response(
      JSON.stringify({
        success: true,
        tokenId: receipt.tokenId?.toString(),
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString(),
        message: `Token "${name}" (${symbol}) created successfully on Hedera testnet`,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('[Hedera] Token creation failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  } finally {
    // Always close the Hedera client connection
    if (hederaClient) {
      await closeHederaClient(hederaClient).catch(console.error);
    }
  }
}
