'use server';

const LIFI_API_URL = process.env.LIFI_API_URL || 'https://li.quest/v1';
const LIFI_API_KEY = process.env.LIFI_API_KEY || '';
const LIFI_QUOTE_TIMEOUT_MS = 12_000;

async function fetchLiFiWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = LIFI_QUOTE_TIMEOUT_MS
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

function getLiFiQuoteError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'LiFi quote is taking too long. Try refreshing the quote.';
  }
  if (error instanceof Error) {
    return error.message || 'Failed to get quote';
  }
  return 'Failed to get quote';
}

async function getLiFiApiErrorMessage(response: Response) {
  const body = await response.text().catch(() => '');
  if (!body) return '';

  try {
    const data = JSON.parse(body);
    console.error('LiFi API Error:', data);
    return data?.message || data?.error || data?.detail || '';
  } catch {
    console.error(`LiFi API Error: ${response.status} ${body.slice(0, 200)}`);
    return body;
  }
}

export const fetchTokensFromLiFi = async (
  chainId: string,
  searchQuery = ''
) => {
  try {
    const url = `${LIFI_API_URL}/tokens?chains=${chainId}${
      searchQuery ? `&search=${searchQuery}` : ''
    }`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-lifi-api-key': LIFI_API_KEY,
      },
    });
    if (!response.ok) {
      // 429s return a plain-text body; don't try to parse it
      console.error(
        `Li.Fi tokens request failed for chain ${chainId}: ${response.status}`
      );
      return [];
    }
    const data = await response.json().catch(() => null);
    return data?.tokens?.[chainId] || [];
  } catch (error) {
    console.error('Error fetching tokens from Li.Fi:', error);
    return [];
  }
};

interface LifiQuoteParams {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAddress: string;
  toAddress: string;
  fromAmount: string;
  slippage: number;
  fee?: string;
}

interface LifiDepositQuoteParams {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAddress: string;
  toAddress: string;
  fromAmount: string;
  slippage: string;
}

export const getLifiDepositQuote = async (params: LifiDepositQuoteParams) => {
  try {
    const queryParams = new URLSearchParams({
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      fromAmount: params.fromAmount,
      slippage: params.slippage,
      integrator: 'SWOP',
    });

    const response = await fetchLiFiWithTimeout(
      `${LIFI_API_URL}/quote?${queryParams}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-lifi-api-key': LIFI_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const apiMessage = await getLiFiApiErrorMessage(response);

      let errorMessage;
      if (response.status === 404) {
        errorMessage =
          apiMessage || 'No route found. Try a different token or amount.';
      } else if (response.status === 400) {
        errorMessage =
          apiMessage || 'Invalid parameters. Please check your selection.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit reached. Please wait and try again.';
      } else {
        errorMessage = 'Unable to get quote. Please try again.';
      }

      return { success: false, error: errorMessage };
    }

    const quote = await response.json();

    if (!quote || !quote.estimate) {
      return {
        success: false,
        error: 'Unable to calculate bridge/swap price.',
      };
    }

    return { success: true, data: quote };
  } catch (error) {
    console.error('Error getting LiFi deposit quote:', error);
    return {
      success: false,
      error: getLiFiQuoteError(error),
    };
  }
};

export const getLifiQuote = async (params: LifiQuoteParams) => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('fromChain', params.fromChain);
    queryParams.append('toChain', params.toChain);
    queryParams.append('fromToken', params.fromToken);
    queryParams.append('toToken', params.toToken);
    queryParams.append('fromAddress', params.fromAddress);
    queryParams.append('toAddress', params.toAddress);
    queryParams.append('fromAmount', params.fromAmount);
    queryParams.append('slippage', params.slippage.toString());
    queryParams.append('integrator', 'SWOP');
    queryParams.append('fee', params.fee || '0.005');

    const response = await fetchLiFiWithTimeout(
      `${LIFI_API_URL}/quote?${queryParams}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-lifi-api-key': LIFI_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const apiMessage = await getLiFiApiErrorMessage(response);

      let errorMessage;
      if (response.status === 404) {
        errorMessage =
          apiMessage ||
          'This cross-chain swap route is not supported. Please try different tokens.';
      } else if (response.status === 400) {
        errorMessage =
          apiMessage ||
          'Invalid swap parameters. Please check your token selection and amounts.';
      } else if (response.status === 429) {
        errorMessage =
          'Service rate limit reached. Please wait a moment and try again.';
      } else if (response.status >= 500) {
        errorMessage =
          'Cross-chain service is temporarily unavailable. Please try again later.';
      } else {
        errorMessage =
          'Unable to find swap route. Please try different tokens or amounts.';
      }

      return { success: false, error: errorMessage };
    }

    const quote = await response.json();

    if (!quote || !quote.estimate) {
      return {
        success: false,
        error: 'Unable to calculate cross-chain swap price. Please try again.',
      };
    }

    return { success: true, data: quote };
  } catch (error) {
    console.error('Error getting LiFi quote:', error);
    return {
      success: false,
      error: getLiFiQuoteError(error),
    };
  }
};
