import {
  getJupiterSwapPreflight,
  type JupiterSwapPreflightInput,
  type JupiterSwapPreflightSuccess,
} from '@/lib/wallet/jupiterSwapPreflight';

type SwapModalJupiterSubmitBlocked = {
  ok: false;
  clearSwapStatus: true;
  error: string;
};

type SwapModalJupiterSubmitReady = {
  ok: true;
  preflight: JupiterSwapPreflightSuccess;
};

export type SwapModalJupiterSubmitResult =
  | SwapModalJupiterSubmitBlocked
  | SwapModalJupiterSubmitReady;

export function resolveSwapModalJupiterSubmit(
  input: JupiterSwapPreflightInput,
): SwapModalJupiterSubmitResult {
  const preflight = getJupiterSwapPreflight(input);
  if (!preflight.ok) {
    return {
      ok: false,
      clearSwapStatus: true,
      error: preflight.error,
    };
  }

  return {
    ok: true,
    preflight,
  };
}
