const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type CheckoutCustomerInfo = {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

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
  checkoutMode?: 'online' | 'in_person';
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
    source?: 'marketplace' | 'nft_template';
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
    email?: string;
    wallet?: {
      address?: string;
    };
  } | null;
  customerInfo?: CheckoutCustomerInfo | null;
  checkoutUrl: string;
  paymentRequest?: {
    rail?: 'solana_pay';
    recipient?: string;
    recipientRole?: 'escrow' | 'merchant';
    merchantWallet?: string;
    amount?: number;
    currency?: string;
    tokenMint?: string;
    tokenDecimals?: number;
    reference?: string;
    label?: string;
    message?: string;
    memo?: string;
    url?: string;
    status?:
      | 'awaiting_payment'
      | 'detected'
      | 'settled'
      | 'expired'
      | 'failed';
    lastCheckedAt?: string | null;
    createdAt?: string | null;
    expiresAt?: string | null;
  } | null;
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
    settlementToken?: string | null;
    settlementAddress?: string | null;
    settlementMode?: string | null;
    platformFeeCollection?: string | null;
    lifiTool?: string | null;
    lifiQuoteId?: string | null;
    lifiIntegrator?: string | null;
    toAmountRaw?: string | null;
    toAmountMinRaw?: string | null;
    feeCosts?: Array<Record<string, unknown>>;
    gasCosts?: Array<Record<string, unknown>>;
    feeProtectedPayout?: boolean;
    payoutProtection?: Record<string, unknown> | null;
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
    destinationChain?: string | null;
    tokenAddress?: string | null;
    error?: string | null;
    completedAt?: string | null;
  };
  marketplaceOrder?: {
    order?: string | null;
    orderId?: string | null;
    publicReference?: string | null;
    status?: string | null;
  } | null;
  refundRequests?: Array<{
    refundId: string;
    status: 'requested' | 'completed' | 'cancelled';
    amount: number;
    currency: string;
    recipientWallet: string;
    tokenMint: string;
    reference: string;
    reason?: string;
    solanaPayUrl: string;
    txHash?: string | null;
    createdAt: string;
    completedAt?: string | null;
  }>;
  merchantRisk?: {
    tier: 'basic' | 'verified_profile' | 'trusted';
    walletOwnership: 'unverified' | 'signed' | 'manual';
    walletScreening:
      | 'not_configured'
      | 'deferred_until_stripe'
      | 'pending'
      | 'clear'
      | 'review'
      | 'blocked';
    dailyLimit: number;
    perPaymentLimit: number;
    reviewedAt?: string | null;
    notes?: string;
  } | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StablecoinMerchantStatus = {
  wallet: {
    address: string;
  };
  trust: {
    tier: 'basic' | 'verified_profile' | 'trusted';
    walletOwnership: 'unverified' | 'signed' | 'manual';
    walletScreening:
      | 'not_configured'
      | 'deferred_until_stripe'
      | 'pending'
      | 'clear'
      | 'review'
      | 'blocked';
    dailyLimit: number;
    perPaymentLimit: number;
    reviewedAt?: string | null;
    notes?: string;
    capabilities: {
      solanaPayLinks: boolean;
      qrTerminal: boolean;
      refunds: boolean;
      csvExport: boolean;
      webhookReconciliation: boolean;
      gasSponsorship: boolean;
      crossChainUsdc: boolean;
    };
  };
  screening: {
    provider: string;
    status: string;
    requiredFor?: string;
  };
  reconciliation: {
    heliusWebhookConfigured: boolean;
    fallbackTxHashSupported: boolean;
  };
  sponsorship: {
    enabled: boolean;
    provider?: string;
    mode?: string;
    requiresVerification?: boolean;
  };
  crossChain: {
    lifiEnabled: boolean;
    provider?: string;
    integrator?: string;
    feeProtectedPayouts?: boolean;
    minOutputMustCoverTotalDue?: boolean;
    minOutputMustCoverRequiredSettlement?: boolean;
    sameNetworkEvmSettlement?: boolean;
    circleCctpEnabled: boolean;
  };
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
    requiredSettlementAmount?: number;
    destinationChain?: string;
    destinationToken?: string;
    settlementAddress?: string;
    settlementMode?: string;
    platformFeeCollection?: string;
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

export async function getStablecoinMerchantStatus(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v5/checkout-intents/merchant-status`, {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  const data = await parseResponse<StablecoinMerchantStatus>(response);
  if (!data.data) throw new Error('Merchant status unavailable');
  return data.data;
}

export async function createCheckoutIntent(
  params: {
    amount?: number;
    description?: string;
    merchantWalletAddress?: string;
    merchantCurrency?: string;
    checkoutMode?: 'online' | 'in_person';
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

export async function reconcileCheckoutIntent(
  intentId: string,
  params: {
    txHash?: string;
    payerWallet?: string;
  },
  accessToken: string
) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-intents/${encodeURIComponent(
      intentId
    )}/reconcile`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(params),
    }
  );
  const data = await parseResponse<CheckoutIntent>(response);
  return {
    success: data.success,
    message: data.message,
    transactionHash: data.transactionHash,
    settlementStatus: data.settlementStatus,
    intent: data.data,
  };
}

export async function createCheckoutRefundRequest(
  intentId: string,
  params: {
    amount?: number;
    payerWallet?: string;
    reason?: string;
  },
  accessToken: string
) {
  const response = await fetch(
    `${API_URL}/api/v5/checkout-intents/${encodeURIComponent(
      intentId
    )}/refund-requests`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(params),
    }
  );
  const data = await parseResponse<CheckoutIntent>(response);
  if (!data.data) throw new Error('Refund request was not created');
  return data.data;
}

export async function createMarketplaceCheckoutIntent(
  params: {
    merchantCurrency?: string;
    checkoutMode?: 'online' | 'in_person';
    checkoutBaseUrl?: string;
    description?: string;
    lineItems: Array<{
      productId: string;
      quantity: number;
    }>;
    customerInfo?: CheckoutCustomerInfo;
  },
  accessToken: string
) {
  const response = await fetch(`${API_URL}/api/v5/checkout-intents/marketplace`, {
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
