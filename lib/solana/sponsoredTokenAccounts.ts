import { Connection, PublicKey } from '@solana/web3.js';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const TOKEN_ACCOUNT_VISIBILITY_ATTEMPTS = 8;
const TOKEN_ACCOUNT_VISIBILITY_INITIAL_DELAY_MS = 250;

export const isNativeSolMint = (mint?: string | null) =>
  mint === SOL_MINT;

type EnsureSponsoredTokenAccountParams = {
  ownerAddress?: string | null;
  mint?: string | null;
  tokenProgramId?: string | null;
  accessToken?: string | null;
  label?: string;
};

type EnsureSponsoredTokenAccountResult = {
  success: boolean;
  tokenAccount?: string;
  tokenProgramId?: string;
  created?: boolean;
  skipped?: boolean;
};

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function waitForTokenAccountVisibility(
  tokenAccount: string,
  label: string,
) {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) return;

  let accountPubkey: PublicKey;
  try {
    accountPubkey = new PublicKey(tokenAccount);
  } catch {
    throw new Error(`Prepared ${label} token account was invalid.`);
  }

  const connection = new Connection(rpcUrl, 'confirmed');

  for (
    let attempt = 0;
    attempt < TOKEN_ACCOUNT_VISIBILITY_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const accountInfo = await connection.getAccountInfo(
        accountPubkey,
        'confirmed',
      );
      if (accountInfo) return;
    } catch {
      // Keep polling through transient RPC/indexing errors.
    }

    const delay = Math.min(
      TOKEN_ACCOUNT_VISIBILITY_INITIAL_DELAY_MS * 2 ** attempt,
      1500,
    );
    await wait(delay);
  }

  throw new Error(
    `Prepared ${label} token account is still syncing. Please try again in a moment.`,
  );
}

export async function ensureSponsoredSolanaTokenAccount({
  ownerAddress,
  mint,
  tokenProgramId,
  accessToken,
  label = 'token',
}: EnsureSponsoredTokenAccountParams): Promise<EnsureSponsoredTokenAccountResult> {
  if (!ownerAddress || !mint || isNativeSolMint(mint)) {
    return { success: true, skipped: true, created: false };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch('/api/v5/wallet/ensure-user-token-account', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userAddress: ownerAddress,
      mint,
      ...(tokenProgramId ? { tokenProgramId } : {}),
    }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Could not prepare ${label} token account`,
    );
  }

  const result = data as EnsureSponsoredTokenAccountResult;
  if (result.tokenAccount) {
    await waitForTokenAccountVisibility(result.tokenAccount, label);
  }

  return result;
}
