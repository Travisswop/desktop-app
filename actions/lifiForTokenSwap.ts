'use server';

const LIFI_API_URL = process.env.LIFI_API_URL || 'https://li.quest/v1';
const LIFI_API_KEY = process.env.LIFI_API_KEY || '';

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
    const data = await response.json();
    return data.tokens[chainId] || [];
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
}

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
    queryParams.append('fee', '0.005');

    const response = await fetch(`${LIFI_API_URL}/quote?${queryParams}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-lifi-api-key': LIFI_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('LiFi API Error:', errorData);

      let errorMessage;
      if (response.status === 404) {
        errorMessage =
          'This cross-chain swap route is not supported. Please try different tokens.';
      } else if (response.status === 400) {
        errorMessage =
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
  } catch (error: any) {
    console.error('Error getting LiFi quote:', error);
    return {
      success: false,
      error: error.message || 'Failed to get LiFi quote',
    };
  }
};
