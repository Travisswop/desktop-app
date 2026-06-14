'use server';

import { PrivyClient } from '@privy-io/node';

/**
 * Signs and sends a partially-signed Solana transaction with the configured
 * Privy payer wallet. Jupiter must build the transaction with this wallet as
 * the `payer`, so this wallet's signature pays the network fee directly.
 *
 * Env vars required:
 *   PRIVY_SIGNER_WALLET_ID      — Privy wallet ID of the sponsor/payer wallet
 *   NEXT_PUBLIC_PRIVY_APP_ID   — Privy app ID
 *   PRIVY_APP_SECRET           — Privy app secret
 */
export async function sponsorSolanaTransaction(
  takerSignedTransactionBase64: string,
): Promise<
  | { success: true; signature: string }
  | { success: false; error: string }
> {
  const walletId =
    process.env.PRIVY_SIGNER_WALLET_ID ||
    process.env.NEXT_PUBLIC_PRIVY_SIGNER_WALLET_ID;
  if (!walletId) {
    return {
      success: false,
      error: 'PRIVY_SIGNER_WALLET_ID is not configured',
    };
  }

  const appId =
    process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    return {
      success: false,
      error: 'Privy server credentials are not configured',
    };
  }

  const privy = new PrivyClient({
    appId,
    appSecret,
  });

  try {
    const response = await privy
      .wallets()
      .solana()
      .signAndSendTransaction(walletId, {
        caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        transaction: takerSignedTransactionBase64,
      });

    const signature = response.hash;
    if (!signature) {
      return {
        success: false,
        error: 'Privy did not return a signature',
      };
    }

    return { success: true, signature };
  } catch (error: any) {
    console.error('Failed to sponsor Solana transaction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to sponsor transaction',
    };
  }
}
