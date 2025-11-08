import { Client, PrivateKey, AccountId, Hbar } from "@hashgraph/sdk";

/**
 * Initializes and returns a Hedera client configured with the operator account.
 * This function should only be called on the server-side (API routes, backend).
 * 
 * The client uses:
 * - MY_ACCOUNT_ID: The Hedera account ID that will act as the operator
 * - MY_PRIVATE_KEY: The private key for the operator account
 * 
 * @returns {Client} A configured Hedera client instance
 * @throws {Error} If required environment variables are missing
 */
export function getHederaClient(): Client {
  const accountId = process.env.MY_ACCOUNT_ID?.trim();
  const privateKey = process.env.MY_PRIVATE_KEY?.trim();

  if (!accountId || !privateKey) {
    throw new Error(
      "Hedera credentials missing from environment variables. Please ensure MY_ACCOUNT_ID and MY_PRIVATE_KEY are set in .env.local"
    );
  }

  try {
    // Initialize client for Hedera testnet
    // To use mainnet instead, change to: Client.forMainnet()
    const client = Client.forTestnet();

    // Set the operator account and private key
    client.setOperator(
      AccountId.fromString(accountId),
      PrivateKey.fromString(privateKey)
    );

    // Set a reasonable default max transaction fee (100 HBAR)
    client.setDefaultMaxTransactionFee(new Hbar(100));

    return client;
  } catch (error) {
    throw new Error(
      `Failed to initialize Hedera client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Closes the Hedera client connection.
 * Call this after completing blockchain operations.
 * 
 * @param {Client} client - The Hedera client instance to close
 */
export async function closeHederaClient(client: Client): Promise<void> {
  try {
    await client.close();
  } catch (error) {
    console.error(
      `Error closing Hedera client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
