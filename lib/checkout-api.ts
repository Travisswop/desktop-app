const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CheckoutIntent = {
  intentId: string;
  status:
    | 'active'
    | 'pending_payment'
    | 'paid'
    | 'conversion_failed'
    | 'settlement_failed'
    | 'settled'
    | 'expired'
    | 'cancelled';
  description: string;
  amount: {
    value: number;
    currency: string;
  };
  fees?: {
    currency: string;
    merchantReceivesAmount: number;
    platformFeeBps: number;
    platformFeeAmount: number;
    slippageBps: number;
    totalDueAmount: number;
  } | null;
  lineItems?: Array<{
    productId?: string | null;
    templateId?: string | null;
    name: string;
    description?: string;
    image?: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    currency: string;
    productType?: string;
  }>;
  merchantCurrency: {
    symbol: string;
    mint: string;
    decimals: number;
  };
  merchant: {
    id?: string;
    name: string;
    wallet: {
      address: string;
    };
  };
  payer?: {
    id?: string;
    name?: string;
    wallet?: {
      address?: string;
    };
  } | null;
  checkoutUrl: string;
  preparedPayment?: {
    rail?: 'solana' | 'lifi';
    sourceChain?: string | null;
    destinationChain?: string | null;
    tokenMint?: string | null;
    tokenDecimals?: number;
    expectedTokenAmount?: number;
    quotedMerchantAmount?: number;
    quotedOutputAmount?: number;
    minOutputAmount?: number;
    requiredSettlementAmount?: number;
    merchantReceivesAmount?: number;
    platformFeeAmount?: number;
    platformFeeBps?: number;
    slippageBps?: number;
    lifiTool?: string | null;
    fromAddress?: string | null;
    toAddress?: string | null;
    preparedAt?: string | null;
  } | null;
  payment?: {
    rail?: 'solana' | 'lifi';
    txHash?: string | null;
    destinationTxHash?: string | null;
    status?: 'pending' | 'completed' | 'failed';
    sourceChain?: string | null;
    destinationChain?: string | null;
    tokenMint?: string | null;
    tokenDecimals?: number;
    tokenAmount?: number;
    receivedAmount?: number;
    error?: string | null;
  };
  swapTransaction?: {
    txHash?: string | null;
    status?: 'pending' | 'completed' | 'failed';
    fromToken?: string | null;
    toToken?: string | null;
    inputAmount?: number;
    outputAmount?: number;
    error?: string | null;
  };
  settlement?: {
    txHash?: string | null;
    status?: 'pending' | 'completed' | 'failed';
    amount?: number;
    totalReceivedAmount?: number;
    platformFeeAmount?: number;
    feeShortfallAmount?: number;
    recipientAddress?: string | null;
    error?: string | null;
    completedAt?: string | null;
  };
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  serializedTransaction?: string;
  transactionHash?: string;
  settlementStatus?: string;
  lifiStatus?: string;
  lifiSubstatus?: string | null;
  transactionRequest?: {
    to: string;
    data: string;
    value?: string;
    from?: string;
    chainId?: number;
    gasLimit?: string;
    gasPrice?: string;
  };
  quote?: {
    merchantReceivesAmount: number;
    platformFeeAmount: number;
    totalDueAmount: number;
    quotedOutputAmount?: number;
    minOutputAmount?: number;
    merchantCurrency: string;
    platformFeeBps?: number;
    slippageBps?: number;
    lifiTool?: string | null;
    approvalAddress?: string | null;
  };
};

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Checkout request failed');
  }

  return data;
}

function authHeaders(accessToken?: string | null) {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function getCheckoutIntent(intentId: string) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-intents/${encodeURIComponent(intentId)}`,
    {
      cache: 'no-store',
    }
  );
  const data = await parseResponse<CheckoutIntent>(response);
  if (!data.data) throw new Error('Checkout intent not found');
  return data.data;
}

export async function listCheckoutIntents(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v5/checkout-intents`, {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  const data = await parseResponse<CheckoutIntent[]>(response);
  return data.data || [];
}

export async function createCheckoutIntent(
  params: {
    amount?: number;
    description?: string;
    merchantWalletAddress?: string;
    merchantCurrency?: string;
    checkoutBaseUrl?: string;
    lineItems?: Array<{
      productId: string;
      quantity: number;
    }>;
  },
  accessToken: string
) {
  const response = await fetch(`${API_URL}/api/v5/checkout-intents`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(params),
  });
  const data = await parseResponse<CheckoutIntent>(response);
  if (!data.data) throw new Error('Checkout intent was not created');
  return data.data;
}

export async function prepareCheckoutTransaction(
  intentId: string,
  params: {
    fromAddress: string;
    tokenMint: string | null;
    tokenDecimals: number;
    tokenAmount: string;
  },
  accessToken: string
) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-intents/${encodeURIComponent(
      intentId
    )}/prepare-transaction`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(params),
    }
  );
  const data = await parseResponse<never>(response);
  if (!data.serializedTransaction) {
    throw new Error('Checkout transaction was not prepared');
  }

  return {
    serializedTransaction: data.serializedTransaction,
    quote: data.quote,
  };
}

export async function prepareCheckoutLifiTransaction(
  intentId: string,
  params: {
    fromAddress: string;
    fromChain: string;
    fromToken: string;
    tokenDecimals: number;
    tokenAmount: string;
  },
  accessToken: string
) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-intents/${encodeURIComponent(
      intentId
    )}/prepare-lifi-transaction`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(params),
    }
  );
  const data = await parseResponse<never>(response);
  if (!data.transactionRequest) {
    throw new Error('LiFi checkout transaction was not prepared');
  }

  return {
    transactionRequest: data.transactionRequest,
    quote: data.quote,
  };
}

export async function submitCheckoutTransaction(
  intentId: string,
  params: {
    signedTransaction: string;
  },
  accessToken: string
) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-intents/${encodeURIComponent(
      intentId
    )}/submit-transaction`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(params),
    }
  );
  const data = await parseResponse<CheckoutIntent>(response);

  return {
    success: data.success,
    transactionHash: data.transactionHash,
    settlementStatus: data.settlementStatus,
    intent: data.data,
  };
}

export async function submitCheckoutLifiTransaction(
  intentId: string,
  params: {
    txHash: string;
  },
  accessToken: string
) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-intents/${encodeURIComponent(
      intentId
    )}/submit-lifi-transaction`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(params),
    }
  );
  const data = await parseResponse<CheckoutIntent>(response);

  return {
    success: data.success,
    transactionHash: data.transactionHash,
    settlementStatus: data.settlementStatus,
    lifiStatus: data.lifiStatus,
    lifiSubstatus: data.lifiSubstatus,
    intent: data.data,
  };
}
