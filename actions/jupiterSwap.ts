'use server';

interface JupiterBuildParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
  slippageBps: number;
  platformFeeBps?: number;
  feeAccount?: string;
  mode?: 'fast';
}

const normalizeSlippageBps = (slippageBpsParam: unknown) => {
  const n = Number(slippageBpsParam);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  // Jupiter expects basis points (0-10000). UI allows up to 50% => 5000 bps.
  return Math.min(Math.max(rounded, 0), 10000);
};

export const getJupiterBuild = async (params: JupiterBuildParams) => {
  try {
    const {
      inputMint,
      outputMint,
      amount,
      taker,
      slippageBps: slippageBpsParam,
      platformFeeBps = 50,
      feeAccount,
      mode,
    } = params;

    const normalizedSlippageBps = normalizeSlippageBps(slippageBpsParam) ?? 300;

    const searchParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      taker,
      slippageBps: normalizedSlippageBps.toString(),
    });
    if (mode) searchParams.set('mode', mode);

    // platformFeeBps requires feeAccount — only include both together
    if (feeAccount && platformFeeBps) {
      searchParams.set('platformFeeBps', platformFeeBps.toString());
      searchParams.set('feeAccount', feeAccount);
    }

    const url = `https://api.jup.ag/swap/v2/build?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.JUPITER_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Error getting Jupiter build:', errorData);

      let errorMessage;
      if (response.status === 429) {
        errorMessage =
          'Service is busy. Please wait a moment and try again.';
      } else if (response.status === 404) {
        errorMessage =
          'This token pair is not available for swapping.';
      } else if (response.status >= 500) {
        errorMessage =
          'Swap service is temporarily down. Please try again later.';
      } else {
        errorMessage =
          errorData?.error ||
          'Unable to get price quote. Please try again.';
      }

      return { success: false, error: errorMessage };
    }

    const buildData = await response.json();

    if (!buildData || !buildData.outAmount) {
      return {
        success: false,
        error:
          'Unable to calculate swap price. Please try different amounts or tokens.',
      };
    }

    return { success: true, data: buildData };
  } catch (error: any) {
    console.error('Error getting Jupiter build:', error);
    return {
      success: false,
      error: error.message || 'Failed to get Jupiter swap',
    };
  }
};

