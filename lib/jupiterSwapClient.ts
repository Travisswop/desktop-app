type JupiterApiResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type JupiterQuoteParams = {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  platformFeeBps?: number;
  swapMode?: 'ExactIn' | 'ExactOut';
};

type JupiterOrderParams = {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
  slippageBps?: number;
  receiver?: string;
};

type JupiterExecuteParams = {
  signedTransaction: string;
  requestId: string;
  lastValidBlockHeight?: string;
};

async function readJupiterJson<T>(response: Response): Promise<JupiterApiResult<T>> {
  const payload = await response.json().catch(() => null);
  if (response.ok && payload?.success !== false) {
    return {
      success: true,
      data: payload?.data ?? payload,
    };
  }

  return {
    success: false,
    error:
      payload?.error ||
      payload?.errorMessage ||
      `Jupiter request failed with HTTP ${response.status}.`,
  };
}

export async function getJupiterQuote(
  params: JupiterQuoteParams
): Promise<JupiterApiResult> {
  const searchParams = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    swapMode: params.swapMode || 'ExactIn',
  });

  if (params.slippageBps !== undefined) {
    searchParams.set('slippageBps', String(params.slippageBps));
  }
  if (params.platformFeeBps !== undefined) {
    searchParams.set('platformFeeBps', String(params.platformFeeBps));
  }

  const response = await fetch(`/api/jupiter/quote?${searchParams.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  return readJupiterJson(response);
}

export async function getJupiterOrder(
  params: JupiterOrderParams
): Promise<JupiterApiResult> {
  const response = await fetch('/api/jupiter/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(params),
  });
  return readJupiterJson(response);
}

export async function executeJupiterOrder(
  params: JupiterExecuteParams
): Promise<JupiterApiResult> {
  const response = await fetch('/api/jupiter/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(params),
  });
  return readJupiterJson(response);
}
