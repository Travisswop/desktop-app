const SOL_MINT = 'So11111111111111111111111111111111111111112';

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

  return data as EnsureSponsoredTokenAccountResult;
}
