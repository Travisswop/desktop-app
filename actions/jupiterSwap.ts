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

interface JupiterOrderParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
  slippageBps?: number;
  receiver?: string;
}

interface JupiterExecuteParams {
  signedTransaction: string; // base64
  requestId: string;
  lastValidBlockHeight?: string;
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

    const normalizedSlippageBps =
      normalizeSlippageBps(slippageBpsParam) ?? 300;

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

export const getJupiterOrder = async (params: JupiterOrderParams) => {
  try {
    const {
      inputMint,
      outputMint,
      amount,
      taker,
      receiver,
      slippageBps,
    } = params;

    const searchParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      taker,
      swapMode: 'ExactIn',
    });

    const normalizedSlippageBps = normalizeSlippageBps(slippageBps);
    if (normalizedSlippageBps !== undefined) {
      searchParams.set(
        'slippageBps',
        normalizedSlippageBps.toString(),
      );
    }
    if (receiver) searchParams.set('receiver', receiver);

    const url = `https://api.jup.ag/swap/v2/order?${searchParams.toString()}`;

    console.log('[Jupiter /order] URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.JUPITER_API_KEY || '',
      },
    });

    const data = await response.json().catch(() => null);
    console.log(
      '[Jupiter /order] Response:',
      JSON.stringify(data, null, 2),
    );
    if (!response.ok) {
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
          data?.errorMessage ||
          data?.error ||
          'Unable to get swap order. Please try again.';
      }
      const errorCode =
        data?.errorCode !== undefined
          ? ` (code ${data.errorCode})`
          : '';
      return {
        success: false,
        error: `${errorMessage}${errorCode} (HTTP ${response.status})`,
      };
    }

    if (!data || !data.outAmount) {
      return {
        success: false,
        error:
          'Unable to calculate swap price. Please try different amounts or tokens.',
      };
    }

    if (!data.transaction || !data.requestId) {
      const appError: string | undefined = data.errorMessage || data.error;
      console.warn(
        '[Jupiter /order] missing transaction. errorCode:',
        data.errorCode,
        'errorMessage:',
        appError,
      );
      return {
        success: false,
        error:
          appError ||
          'This token pair cannot be swapped via Jupiter at this time.',
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting Jupiter order:', error);
    return {
      success: false,
      error: error.message || 'Failed to get Jupiter order',
    };
  }
};

export const executeJupiterOrder = async (
  params: JupiterExecuteParams,
) => {
  try {
    const url = `https://api.jup.ag/swap/v2/execute`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.JUPITER_API_KEY || '',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.errorMessage ||
        data?.error ||
        'Unable to execute swap. Please try again.';
      return { success: false, error: errorMessage };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error executing Jupiter order:', error);
    return {
      success: false,
      error: error.message || 'Failed to execute Jupiter order',
    };
  }
};
