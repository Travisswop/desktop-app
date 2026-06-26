import {
  decimalAmountToRawUnits,
  normalizeTokenDecimals,
} from '@/lib/wallet/swapAmounts';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

type JupiterSwapTokenLike = {
  symbol?: string | null;
  address?: string | null;
  id?: string | null;
  decimals?: number | string | bigint | null;
};

export type JupiterSwapPreflightInput = {
  solanaReady: boolean;
  selectedSolanaWalletAddress?: string | null;
  solanaWalletMismatchError?: string | null;
  payToken?: JupiterSwapTokenLike | null;
  receiveToken?: JupiterSwapTokenLike | null;
  payAmount: string | number;
};

export type JupiterSwapPreflightFailure = {
  ok: false;
  error: string;
};

export type JupiterSwapPreflightSuccess = {
  ok: true;
  inputMint: string;
  outputMint: string;
  amountInSmallestUnit: string;
};

export type JupiterSwapPreflightResult =
  | JupiterSwapPreflightFailure
  | JupiterSwapPreflightSuccess;

const getTokenMint = (token?: JupiterSwapTokenLike | null) =>
  token?.symbol === 'SOL'
    ? SOL_MINT
    : token?.address || token?.id || '';

const getTokenDecimals = (
  decimals?: JupiterSwapTokenLike['decimals'],
): number | bigint | undefined => {
  if (typeof decimals === 'string') {
    const parsed = Number(decimals);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return decimals ?? undefined;
};

export function getJupiterSwapPreflight({
  solanaReady,
  selectedSolanaWalletAddress,
  solanaWalletMismatchError,
  payToken,
  receiveToken,
  payAmount,
}: JupiterSwapPreflightInput): JupiterSwapPreflightResult {
  if (!solanaReady) {
    return {
      ok: false,
      error: 'Solana wallet is not ready. Please wait and try again.',
    };
  }

  if (!selectedSolanaWalletAddress) {
    return {
      ok: false,
      error:
        solanaWalletMismatchError || 'No Solana wallet connected',
    };
  }

  const inputMint = getTokenMint(payToken);
  const outputMint = getTokenMint(receiveToken);

  if (!inputMint || !outputMint) {
    return {
      ok: false,
      error: 'Invalid token addresses',
    };
  }

  if (inputMint.toLowerCase() === outputMint.toLowerCase()) {
    return {
      ok: false,
      error:
        'Pay token and receive token are the same. Please select different tokens.',
    };
  }

  const amountInSmallestUnit =
    decimalAmountToRawUnits(
      payAmount,
      normalizeTokenDecimals(getTokenDecimals(payToken?.decimals), 6),
    )?.toString() ?? '0';

  return {
    ok: true,
    inputMint,
    outputMint,
    amountInSmallestUnit,
  };
}
