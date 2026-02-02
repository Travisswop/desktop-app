'use server';

interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
  platformFeeBps?: number;
}

interface JupiterSwapParams {
  quoteResponse: any;
  userPublicKey: string;
  feeAccount?: string;
}

export const getJupiterQuote = async (params: JupiterQuoteParams) => {
  try {
    const { inputMint, outputMint, amount, slippageBps, platformFeeBps = 50 } = params;

    const url = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&restrictIntermediateTokens=true&platformFeeBps=${platformFeeBps}&instructionVersion=V2`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.JUPITER_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      let errorMessage;
      if (response.status === 429) {
        errorMessage = 'Service is busy. Please wait a moment and try again.';
      } else if (response.status === 404) {
        errorMessage = 'This token pair is not available for swapping.';
      } else if (response.status >= 500) {
        errorMessage = 'Swap service is temporarily down. Please try again later.';
      } else {
        errorMessage = errorData?.error || 'Unable to get price quote. Please try again.';
      }

      return { success: false, error: errorMessage };
    }

    const jupiterQuote = await response.json();

    if (!jupiterQuote || !jupiterQuote.outAmount) {
      return {
        success: false,
        error: 'Unable to calculate swap price. Please try different amounts or tokens.',
      };
    }

    return { success: true, data: jupiterQuote };
  } catch (error: any) {
    console.error('Error getting Jupiter quote:', error);
    return {
      success: false,
      error: error.message || 'Failed to get Jupiter quote',
    };
  }
};

export const getJupiterSwapTransaction = async (params: JupiterSwapParams) => {
  try {
    const { quoteResponse, userPublicKey, feeAccount } = params;

    const requestBody: any = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    };

    if (feeAccount) {
      requestBody.feeAccount = feeAccount;
      requestBody.platformFeeBps = 50;
    }

    const response = await fetch('https://api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.JUPITER_API_KEY || '',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.error || 'Failed to get swap transaction',
      };
    }

    const swapData = await response.json();
    return { success: true, data: swapData };
  } catch (error: any) {
    console.error('Error getting Jupiter swap transaction:', error);
    return {
      success: false,
      error: error.message || 'Failed to get swap transaction',
    };
  }
};
