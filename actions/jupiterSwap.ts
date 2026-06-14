'use server';

import { PrivyClient } from '@privy-io/node';

interface JupiterBuildParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
  payer?: string;
  slippageBps: number;
  platformFeeBps?: number;
  feeAccount?: string;
  mode?: 'fast';
  instructionVersion?: 'V1' | 'V2';
  wrapAndUnwrapSol?: boolean;
  nativeDestinationAccount?: string;
}

interface JupiterOrderParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
  slippageBps?: number;
  receiver?: string;
}

interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  platformFeeBps?: number;
  swapMode?: 'ExactIn' | 'ExactOut';
}

interface JupiterExecuteParams {
  signedTransaction: string; // base64
  requestId: string;
  lastValidBlockHeight?: string;
}

type JupiterQuoteEndpoint = {
  url: string;
  headers: Record<string, string>;
};

const JUPITER_QUOTE_TIMEOUT_MS = 8_000;

const getJupiterApiKey = () => process.env.JUPITER_API_KEY?.trim();
const getPrivyAppId = () =>
  process.env.PRIVY_APP_ID?.trim() ||
  process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
const getPrivyAppSecret = () => process.env.PRIVY_APP_SECRET?.trim();
const getPrivySponsorWalletId = () =>
  process.env.PRIVY_SIGNER_WALLET_ID?.trim() ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_WALLET_ID?.trim();
const getPrivySponsorWalletAddress = () =>
  process.env.PRIVY_SIGNER_WALLET_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_PRIVY_SIGNER_WALLET_ADDRESS?.trim();

const getJupiterApiHeaders = (includeApiKey = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeApiKey) {
    const apiKey = getJupiterApiKey();
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
  }

  return headers;
};

async function fetchJupiterWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = JUPITER_QUOTE_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getJupiterQuoteError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Jupiter quote is taking too long. Try refreshing the quote.';
  }
  if (error instanceof Error) {
    return error.message || 'Failed to get Jupiter quote';
  }
  return 'Failed to get Jupiter quote';
}

const normalizeSlippageBps = (slippageBpsParam: unknown) => {
  const n = Number(slippageBpsParam);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  // Jupiter expects basis points (0-10000). UI allows up to 50% => 5000 bps.
  return Math.min(Math.max(rounded, 0), 10000);
};

export const getJupiterQuote = async (params: JupiterQuoteParams) => {
  try {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps: slippageBpsParam,
      platformFeeBps,
      swapMode = 'ExactIn',
    } = params;

    const searchParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      swapMode,
    });

    const normalizedSlippageBps = normalizeSlippageBps(slippageBpsParam);
    if (normalizedSlippageBps !== undefined) {
      searchParams.set('slippageBps', normalizedSlippageBps.toString());
    }
    if (platformFeeBps) {
      searchParams.set('platformFeeBps', platformFeeBps.toString());
    }

    const quoteUrls: JupiterQuoteEndpoint[] = [
      {
        url: `https://api.jup.ag/swap/v1/quote?${searchParams.toString()}`,
        headers: getJupiterApiHeaders(true),
      },
      {
        url: `https://lite-api.jup.ag/swap/v1/quote?${searchParams.toString()}`,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ];

    let response: Response | null = null;
    let data: any = null;
    for (const [index, endpoint] of quoteUrls.entries()) {
      response = await fetchJupiterWithTimeout(endpoint.url, {
        method: 'GET',
        headers: endpoint.headers,
      });
      data = await response.json().catch(() => null);
      if (response.ok || (response.status !== 429 && response.status < 500)) {
        break;
      }
      if (index < quoteUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!response || !response.ok) {
      let errorMessage;
      if (response?.status === 429) {
        errorMessage =
          'Service is busy. Please wait a moment and try again.';
      } else if (response?.status === 404) {
        errorMessage =
          'This token pair is not available for swapping.';
      } else if (response && response.status >= 500) {
        errorMessage =
          'Swap service is temporarily down. Please try again later.';
      } else {
        errorMessage =
          data?.errorMessage ||
          data?.error ||
          'Unable to get price quote. Please try again.';
      }

      return { success: false, error: errorMessage };
    }

    if (!data || !data.outAmount) {
      return {
        success: false,
        error:
          'Unable to calculate swap price. Please try different amounts or tokens.',
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error getting Jupiter quote:', error);
    return {
      success: false,
      error: getJupiterQuoteError(error),
    };
  }
};

export const getSolanaSponsorPayer = async (): Promise<
  | { success: true; address: string; walletId: string }
  | { success: false; error: string }
> => {
  const walletId = getPrivySponsorWalletId();
  if (!walletId) {
    return {
      success: false,
      error: 'Solana sponsor wallet is not configured.',
    };
  }

  const configuredAddress = getPrivySponsorWalletAddress();
  if (configuredAddress) {
    return { success: true, address: configuredAddress, walletId };
  }

  const appId = getPrivyAppId();
  const appSecret = getPrivyAppSecret();
  if (!appId || !appSecret) {
    return {
      success: false,
      error:
        'Privy server credentials are not configured for the sponsor wallet.',
    };
  }

  try {
    const privy = new PrivyClient({ appId, appSecret });
    const wallet = await privy.wallets().get(walletId);
    if (!wallet?.address) {
      return {
        success: false,
        error: 'Privy sponsor wallet did not return an address.',
      };
    }
    if (wallet.chain_type && wallet.chain_type !== 'solana') {
      return {
        success: false,
        error: 'Configured sponsor wallet is not a Solana wallet.',
      };
    }
    return { success: true, address: wallet.address, walletId };
  } catch (error: any) {
    console.error('Failed to resolve Solana sponsor wallet:', error);
    return {
      success: false,
      error:
        error?.message || 'Failed to resolve Solana sponsor wallet.',
    };
  }
};

export const getJupiterBuild = async (params: JupiterBuildParams) => {
  try {
    const {
      inputMint,
      outputMint,
      amount,
      taker,
      payer,
      slippageBps: slippageBpsParam,
      platformFeeBps = 50,
      feeAccount,
      mode,
      instructionVersion,
      wrapAndUnwrapSol,
      nativeDestinationAccount,
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
    if (instructionVersion) {
      searchParams.set('instructionVersion', instructionVersion);
    }
    if (wrapAndUnwrapSol !== undefined) {
      searchParams.set('wrapAndUnwrapSol', String(wrapAndUnwrapSol));
    }
    if (nativeDestinationAccount) {
      searchParams.set('nativeDestinationAccount', nativeDestinationAccount);
    }
    if (payer && payer !== taker) {
      searchParams.set('payer', payer);
    }

    // platformFeeBps requires feeAccount — only include both together
    if (feeAccount && platformFeeBps) {
      searchParams.set('platformFeeBps', platformFeeBps.toString());
      searchParams.set('feeAccount', feeAccount);
    }

    const buildUrls: JupiterQuoteEndpoint[] = [];

    if (getJupiterApiKey()) {
      buildUrls.push({
        url: `https://api.jup.ag/swap/v2/build?${searchParams.toString()}`,
        headers: getJupiterApiHeaders(true),
      });
    }

    buildUrls.push({
      url: `https://lite-api.jup.ag/swap/v2/build?${searchParams.toString()}`,
      headers: getJupiterApiHeaders(),
    });

    let response: Response | null = null;
    let buildData: any = null;

    for (const [index, endpoint] of buildUrls.entries()) {
      response = await fetchJupiterWithTimeout(
        endpoint.url,
        {
          method: 'GET',
          headers: endpoint.headers,
        },
      );
      buildData = await response.json().catch(() => null);

      if (response.ok) {
        break;
      }

      const shouldRetry =
        (response.status === 401 ||
          response.status === 403 ||
          response.status === 429 ||
          response.status >= 500) &&
        index < buildUrls.length - 1;

      if (shouldRetry) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!response || !response.ok) {
      console.error('Error getting Jupiter build:', buildData);

      const status = response?.status || 502;
      let errorMessage;
      if (status === 401 || status === 403) {
        errorMessage =
          'Jupiter build is temporarily unavailable. Please try again.';
      } else if (status === 429) {
        errorMessage =
          'Service is busy. Please wait a moment and try again.';
      } else if (status === 404) {
        errorMessage =
          'This token pair is not available for swapping.';
      } else if (status >= 500) {
        errorMessage =
          'Swap service is temporarily down. Please try again later.';
      } else {
        errorMessage =
          buildData?.errorMessage ||
          buildData?.error ||
          'Unable to get price quote. Please try again.';
      }

      return { success: false, error: errorMessage };
    }

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
      headers: getJupiterApiHeaders(true),
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
      headers: getJupiterApiHeaders(true),
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
