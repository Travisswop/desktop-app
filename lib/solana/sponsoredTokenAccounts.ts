import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const TOKEN_ACCOUNT_VISIBILITY_ATTEMPTS = 12;
const TOKEN_ACCOUNT_VISIBILITY_INITIAL_DELAY_MS = 400;
const TOKEN_ACCOUNT_VISIBILITY_MAX_DELAY_MS = 2500;
const TOKEN_ACCOUNT_PROPAGATION_RETRY_DELAY_MS = 2500;

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
  {
    mint,
    ownerAddress,
    tokenProgramId,
  }: {
    mint?: string | null;
    ownerAddress?: string | null;
    tokenProgramId?: string | null;
  } = {},
) {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) return;

  let accountPubkey: PublicKey;
  let mintPubkey: PublicKey | null = null;
  let ownerPubkey: PublicKey | null = null;
  let programPubkey: PublicKey = TOKEN_PROGRAM_ID;
  try {
    accountPubkey = new PublicKey(tokenAccount);
    if (mint) mintPubkey = new PublicKey(mint);
    if (ownerAddress) ownerPubkey = new PublicKey(ownerAddress);
    if (tokenProgramId) programPubkey = new PublicKey(tokenProgramId);
  } catch {
    throw new Error(`Prepared ${label} token account was invalid.`);
  }

  const connection = new Connection(rpcUrl, 'finalized');

  for (
    let attempt = 0;
    attempt < TOKEN_ACCOUNT_VISIBILITY_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const account = await getAccount(
        connection,
        accountPubkey,
        'finalized',
        programPubkey,
      );
      const mintMatches = !mintPubkey || account.mint.equals(mintPubkey);
      const ownerMatches = !ownerPubkey || account.owner.equals(ownerPubkey);
      if (mintMatches && ownerMatches) return;
    } catch {
      // Keep polling through transient RPC/indexing errors.
    }

    const delay = Math.min(
      TOKEN_ACCOUNT_VISIBILITY_INITIAL_DELAY_MS * 2 ** attempt,
      TOKEN_ACCOUNT_VISIBILITY_MAX_DELAY_MS,
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
    await waitForTokenAccountVisibility(result.tokenAccount, label, {
      mint,
      ownerAddress,
      tokenProgramId: result.tokenProgramId || tokenProgramId,
    });
  }

  return result;
}

export function isSolanaInvalidAccountDataError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  return /InvalidAccountData|invalid account data for instruction|Tokenkeg/i.test(
    message,
  );
}

export async function retrySolanaInvalidAccountData<T>(
  run: () => Promise<T>,
  {
    label = 'recipient token account',
    retryDelayMs = TOKEN_ACCOUNT_PROPAGATION_RETRY_DELAY_MS,
  }: {
    label?: string;
    retryDelayMs?: number;
  } = {},
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isSolanaInvalidAccountDataError(error)) throw error;
    await wait(retryDelayMs);
  }

  try {
    return await run();
  } catch (error) {
    if (!isSolanaInvalidAccountDataError(error)) throw error;
    throw new Error(
      `${label} is still syncing with Solana. Please try again in a moment.`,
    );
  }
}
