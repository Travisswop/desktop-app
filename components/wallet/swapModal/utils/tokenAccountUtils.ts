import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import {
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { PLATFORM_FEE_WALLET } from './feeConfig';

// Cache for token accounts to avoid repeated lookups
const tokenAccountCache = new Map<string, PublicKey>();

/**
 * Gets or creates a token account for the platform fee wallet
 * @param connection The Solana connection
 * @param mint The mint address of the token
 * @param payerKeypair The keypair to pay for the transaction if a new account needs to be created
 * @returns The token account public key
 */
export async function getOrCreateFeeTokenAccount(
  connection: Connection,
  mint: PublicKey,
  payerKeypair: Keypair
): Promise<PublicKey> {
  const mintKey = mint.toString();
  console.log(
    `Getting or creating token account for mint: ${mintKey}`
  );
  console.log(
    `Platform fee wallet: ${PLATFORM_FEE_WALLET.toString()}`
  );

  // Validate mint and platform fee wallet are valid PublicKeys
  if (!PublicKey.isOnCurve(mint.toBuffer())) {
    throw new Error(`Invalid mint address: ${mintKey}`);
  }

  // Check cache first
  if (tokenAccountCache.has(mintKey)) {
    const cachedAccount = tokenAccountCache.get(mintKey)!;
    console.log(
      `Using cached token account: ${cachedAccount.toString()}`
    );
    return cachedAccount;
  }

  try {
    // Get the associated token address for the platform fee wallet
    console.log('Getting associated token address...');
    const tokenAddress = await getAssociatedTokenAddress(
      mint,
      PLATFORM_FEE_WALLET,
      false // allowOwnerOffCurve should be false for a normal account
    );
    console.log(
      `Associated token address: ${tokenAddress.toString()}`
    );

    // Check if the token account already exists
    try {
      console.log('Checking if token account exists...');
      await getAccount(connection, tokenAddress);
      // Account exists, so we use it
      console.log('Token account exists, using it');
      tokenAccountCache.set(mintKey, tokenAddress);
      return tokenAddress;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        // Token account doesn't exist, create it
        console.log(
          `Token account not found. Creating new token account for mint ${mintKey}`
        );
        try {
          const newAccount = await createAssociatedTokenAccount(
            connection,
            payerKeypair,
            mint,
            PLATFORM_FEE_WALLET
          );
          console.log(
            `Created new token account: ${newAccount.toString()}`
          );
          tokenAccountCache.set(mintKey, newAccount);
          return newAccount;
        } catch (createError) {
          console.error('Error creating token account:', createError);
          throw new Error(
            `Failed to create token account: ${
              (createError as Error).message
            }`
          );
        }
      }
      console.error('Error checking token account:', error);
      throw error;
    }
  } catch (error) {
    console.error(
      'Error getting or creating fee token account:',
      error
    );
    throw new Error(
      `Fee token account error: ${(error as Error).message}`
    );
  }
}
