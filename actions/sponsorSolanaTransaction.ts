'use server';

import { PrivyClient } from '@privy-io/node';

/**
 * Signs and sends a partially-signed Solana transaction with the provided
 * Privy wallet. Jupiter must build the transaction with this wallet as the
 * `payer`, so this wallet's signature matches the transaction fee payer.
 *
 * Env vars required:
 *   NEXT_PUBLIC_PRIVY_APP_ID  — Privy app ID
 *   PRIVY_APP_SECRET          — Privy app secret
 *
 * If the payer wallet requires user-owner authorization, pass the user's Privy
 * access token. The Privy SDK exchanges it for a time-bound user key and adds
 * the `privy-authorization-signature` header for this exact request.
 */
export async function sponsorSolanaTransaction(
  takerSignedTransactionBase64: string,
  walletId: string,
  privyAccessToken?: string | null,
): Promise<
  | { success: true; signature: string }
  | { success: false; error: string }
> {
  if (!walletId) {
    return {
      success: false,
      error: 'Privy wallet ID is required',
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
        sponsor: true,
        ...(privyAccessToken
          ? {
              authorization_context: {
                user_jwts: [privyAccessToken],
              },
            }
          : {}),
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
