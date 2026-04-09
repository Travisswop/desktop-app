'use server';

import { PrivyClient } from '@privy-io/node';

/**
 * Signs a partially-signed Solana transaction (taker-signed) with the
 * configured Privy payer wallet, adding the fee-payer signature required
 * by Jupiter's gasless swap flow (`payer` param on /order).
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
  const walletId = process.env.PRIVY_SIGNER_WALLET_ID;
  if (!walletId) {
    return {
      success: false,
      error: 'PRIVY_SIGNER_WALLET_ID is not configured',
    };
  }

  const privy = new PrivyClient({
    appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    appSecret: process.env.PRIVY_APP_SECRET!,
  });

  try {
    const response = await privy
      .wallets()
      .solana()
      .signAndSendTransaction(walletId, {
        caip2: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        transaction: takerSignedTransactionBase64,
        sponsor: true,
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
