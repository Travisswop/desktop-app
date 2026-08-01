import { polygon } from 'viem/chains';

type SponsoredSafeExecParams = {
  appAccessToken: string;
  privyAccessToken: string;
  walletId: string;
  ownerAddress: `0x${string}`;
  safeAddress: `0x${string}`;
  execCalldata: `0x${string}`;
  apiBase?: string;
};

type SponsoredTransactionResponse = {
  hash?: string;
  error?: string;
  details?: string;
  result?: {
    hash?: string;
    transaction_hash?: string;
    data?: { hash?: string };
  };
};

/**
 * Sends an already owner-signed Safe execTransaction through Swop's existing
 * Privy gas sponsor. The embedded EOA is the outer transaction sender while
 * the Safe validates the packed owner signature inside execCalldata.
 */
export async function submitSponsoredSafeExecTransaction({
  appAccessToken,
  privyAccessToken,
  walletId,
  ownerAddress,
  safeAddress,
  execCalldata,
  apiBase = process.env.NEXT_PUBLIC_API_URL || '',
}: SponsoredSafeExecParams): Promise<`0x${string}`> {
  const normalizedApiBase = apiBase.replace(/\/$/, '');
  if (!normalizedApiBase) {
    throw new Error('Swop API is not configured for gas sponsorship.');
  }

  const response = await fetch(
    `${normalizedApiBase}/api/v5/wallet/sponsored-transaction-evm`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appAccessToken}`,
      },
      body: JSON.stringify({
        walletId,
        chainId: polygon.id,
        transaction: {
          from: ownerAddress,
          to: safeAddress,
          data: execCalldata,
          value: '0x0',
        },
        privyAccessToken,
      }),
      cache: 'no-store',
    },
  );

  const body = (await response
    .json()
    .catch(() => ({}))) as SponsoredTransactionResponse;
  if (!response.ok) {
    throw new Error(
      body.details ||
        body.error ||
        'Privy gas sponsorship could not submit the Safe transaction.',
    );
  }

  const hash =
    body.hash ||
    body.result?.data?.hash ||
    body.result?.hash ||
    body.result?.transaction_hash;
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error('Privy did not return a valid Polygon transaction hash.');
  }

  return hash as `0x${string}`;
}
