import { apiFetch } from '@/lib/api/apiFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type MarketplaceProductType =
  | 'digital'
  | 'physical'
  | 'in_person_checkout';

export type MarketplaceProduct = {
  _id: string;
  merchant?: {
    id?: string | null;
    name?: string;
    email?: string;
    wallet?: { address?: string };
  };
  micrositeId?: string | null;
  status: 'draft' | 'live' | 'archived';
  productType: MarketplaceProductType;
  title: string;
  description?: string;
  images?: Array<{ url: string; alt?: string }>;
  primaryImage?: string;
  price?: {
    amount?: number;
    currency?: string;
  };
  /** Token the merchant is paid out in. Price is always USD. */
  payoutToken?: string;
  inventory?: {
    track?: boolean;
    available?: number | null;
    sold?: number;
    sku?: string;
  };
  variants?: MarketplaceProductVariant[];
  fulfillment?: {
    requiresShipping?: boolean;
    shippingCost?: number;
    digitalDeliveryNote?: string;
    digitalAsset?: MarketplaceDigitalAsset;
    inPersonInstructions?: string;
    trackingEnabled?: boolean;
  };
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type MarketplaceProductVariant = {
  name?: string;
  options?: Array<{
    name?: string;
    quantity?: number;
    sold?: number;
  }>;
};

export type MarketplaceOrder = {
  _id: string;
  orderId: string;
  publicReference?: string;
  buyer?: MarketplaceParty;
  merchant?: MarketplaceParty;
  orderType: MarketplaceProductType | 'mixed';
  checkoutMode?: 'online' | 'in_person';
  lineItems?: MarketplaceOrderLine[];
  financial?: {
    subtotal?: number;
    shippingCost?: number;
    totalCost?: number;
    currency?: string;
  };
  payment?: {
    status?: string;
    method?: string;
    txHash?: string | null;
    paymentIntentId?: string | null;
    amount?: number;
    currency?: string;
    paidAt?: string | null;
  };
  settlement?: {
    policy?: 'direct' | 'escrow_on_receipt';
    status?: string;
    amount?: number;
    currency?: string;
    grossAmount?: number;
    platformFeeBps?: number;
    platformFeeAmount?: number;
    merchantReceivesAmount?: number;
    recipientAddress?: string;
    txHash?: string | null;
    releasedAt?: string | null;
    releaseReason?: string;
    mode?: string;
    error?: string | null;
  };
  receipt?: MarketplaceReceiptState;
  fulfillment?: {
    status?: string;
    requiresShipping?: boolean;
    trackingNumber?: string;
    carrier?: string;
    estimatedDeliveryDate?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    receiptConfirmedAt?: string | null;
    events?: MarketplaceFulfillmentEvent[];
    releaseConditions?: {
      shippingConfirmed?: boolean;
      customerReceiptConfirmed?: boolean;
    };
  };
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MarketplaceParty = {
  id?: string | null;
  name?: string;
  email?: string;
  wallet?: { address?: string };
};

// True only for shippable orders that have nothing left to do: a delivery
// flow exists (requiresShipping) and confirmations are pending.
export function orderRequiresShippingFlow(order: MarketplaceOrder) {
  return (
    Boolean(order.fulfillment?.requiresShipping) ||
    (order.fulfillment?.status !== undefined &&
      order.fulfillment.status !== 'not_required')
  );
}

// The seller has independently confirmed the shipment was delivered.
export function sellerConfirmedDelivery(order: MarketplaceOrder) {
  const fulfillment = order.fulfillment;
  return Boolean(
    fulfillment?.releaseConditions?.shippingConfirmed ||
      fulfillment?.deliveredAt ||
      fulfillment?.status === 'delivered'
  );
}

// The buyer has independently confirmed they received the order.
export function buyerConfirmedReceipt(order: MarketplaceOrder) {
  const fulfillment = order.fulfillment;
  return Boolean(
    fulfillment?.releaseConditions?.customerReceiptConfirmed ||
      fulfillment?.receiptConfirmedAt ||
      fulfillment?.status === 'receipt_confirmed'
  );
}

// A shippable order is only "delivered/complete" once BOTH parties confirm —
// the seller confirms delivery AND the buyer confirms receipt. Until then it
// stays pending, regardless of settlement release or auto-completion.
export function deliveryFullyConfirmed(order: MarketplaceOrder) {
  return sellerConfirmedDelivery(order) && buyerConfirmedReceipt(order);
}

export type MarketplaceOrderLine = {
  productId?: string;
  quantity: number;
  unitAmount: number;
  totalAmount?: number;
  currency?: string;
  productSnapshot?: {
    title?: string;
    description?: string;
    image?: string;
    productType?: MarketplaceProductType;
    sku?: string;
    digitalAsset?: MarketplaceDigitalAsset;
  };
};

export type MarketplaceDigitalAsset = {
  enabled?: boolean;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  storageKey?: string;
  uploadedAt?: string;
  accessPolicy?: 'receipt_nft';
};

export type MarketplaceReceiptState = {
  receiptId?: string | null;
  status?: 'pending' | 'minting' | 'minted' | 'failed';
  mintAddress?: string | null;
  provider?: string | null;
  txHash?: string | null;
  metadataUri?: string | null;
  error?: string | null;
  mintedAt?: string | null;
};

export type MarketplaceSettlementStatus =
  | 'pending'
  | 'held'
  | 'release_pending'
  | 'released'
  | 'failed'
  | 'refunded';

export type MarketplaceFulfillmentEvent = {
  stage: string;
  status?: string;
  timestamp?: string;
  details?: Record<string, unknown> | null;
};

export type MarketplaceReceiptDownload = {
  productId: string;
  name: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  accessPolicy?: 'receipt_nft';
};

export type PublicMarketplaceReceipt = {
  receipt: {
    publicReference: string;
    orderId?: string;
    status?: string;
    mintAddress?: string | null;
    provider?: string | null;
    mintedAt?: string | null;
  };
  order: {
    paymentStatus?: string;
    merchant?: {
      name?: string;
      wallet?: { address?: string } | null;
    };
    buyer?: {
      name?: string;
      wallet?: { address?: string } | null;
    };
    financial?: {
      totalCost?: number;
      currency?: string;
    } | null;
    createdAt?: string;
    paidAt?: string | null;
  };
  downloads: MarketplaceReceiptDownload[];
};

export type ReceiptUnlockMessage = {
  walletAddress: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

export type ListMarketplaceProductsResponse = {
  items: MarketplaceProduct[];
  total: number;
  page: number;
  limit: number;
};

export type ListMarketplaceOrdersResponse = {
  items: MarketplaceOrder[];
  total: number;
  page: number;
  limit: number;
};

type ApiEnvelope<T> = {
  state?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

function authHeaders(accessToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function authOnlyHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseMarketplaceResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || body.state === 'failed' || body.success === false) {
    throw new Error(
      body.message || body.error || `Marketplace request failed: ${response.status}`
    );
  }

  if (body.data === undefined) {
    throw new Error('Marketplace response did not include data.');
  }

  return body.data;
}

function marketplaceUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  const url = new URL(`/api/v2/desktop/marketplace${path}`, API_URL);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export async function listMarketplaceProducts(
  accessToken: string,
  params: {
    scope?: 'mine';
    mine?: boolean;
    status?: string;
    productType?: MarketplaceProductType;
    merchantId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const response = await apiFetch(marketplaceUrl('/products', params), {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  return parseMarketplaceResponse<ListMarketplaceProductsResponse>(response);
}

export async function getMarketplaceProduct(
  accessToken: string,
  productId: string
) {
  const response = await fetch(
    marketplaceUrl(`/products/${encodeURIComponent(productId)}`),
    {
      headers: authHeaders(accessToken),
      cache: 'no-store',
    }
  );
  return parseMarketplaceResponse<MarketplaceProduct>(response);
}

export async function listPublicMarketplaceProducts(
  params: {
    micrositeId?: string;
    merchantId?: string;
    productId?: string;
    productType?: MarketplaceProductType;
    page?: number;
    limit?: number;
  } = {}
) {
  const response = await apiFetch(marketplaceUrl('/public/products', params), {
    cache: 'no-store',
  });
  return parseMarketplaceResponse<ListMarketplaceProductsResponse>(response);
}

export async function getPublicMarketplaceReceipt(publicReference: string) {
  const response = await apiFetch(
    marketplaceUrl(`/public/receipts/${encodeURIComponent(publicReference)}`),
    {
      cache: 'no-store',
    }
  );
  return parseMarketplaceResponse<PublicMarketplaceReceipt>(response);
}

export async function getMarketplaceReceiptUnlockMessage(
  publicReference: string,
  walletAddress: string
) {
  const response = await apiFetch(
    marketplaceUrl(
      `/public/receipts/${encodeURIComponent(publicReference)}/unlock-message`,
      { walletAddress }
    ),
    {
      cache: 'no-store',
    }
  );
  return parseMarketplaceResponse<ReceiptUnlockMessage>(response);
}

export async function createMarketplaceProduct(
  accessToken: string,
  payload: Record<string, unknown>
) {
  const response = await apiFetch(marketplaceUrl('/products'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return parseMarketplaceResponse<MarketplaceProduct>(response);
}

export async function updateMarketplaceProduct(
  accessToken: string,
  productId: string,
  payload: Record<string, unknown>
) {
  const response = await apiFetch(
    marketplaceUrl(`/products/${encodeURIComponent(productId)}`),
    {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return parseMarketplaceResponse<MarketplaceProduct>(response);
}

export async function uploadMarketplaceDigitalAsset(
  accessToken: string,
  file: File
) {
  const form = new FormData();
  form.append('file', file);

  const response = await apiFetch(marketplaceUrl('/products/digital-asset'), {
    method: 'POST',
    headers: authOnlyHeaders(accessToken),
    body: form,
  });
  return parseMarketplaceResponse<MarketplaceDigitalAsset>(response);
}

export async function listMarketplaceOrders(
  accessToken: string,
  params: {
    role?: 'all' | 'buyer' | 'merchant' | 'seller';
    status?: string;
    paymentStatus?: string;
    settlementStatus?: string;
    settlementPolicy?: string;
    receiptStatus?: string;
    fulfillmentStatus?: string;
    orderType?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const response = await apiFetch(marketplaceUrl('/orders', params), {
    headers: authHeaders(accessToken),
    cache: 'no-store',
  });
  return parseMarketplaceResponse<ListMarketplaceOrdersResponse>(response);
}

export async function getMarketplaceOrder(accessToken: string, orderId: string) {
  const response = await apiFetch(
    marketplaceUrl(`/orders/${encodeURIComponent(orderId)}`),
    {
      headers: authHeaders(accessToken),
      cache: 'no-store',
    }
  );
  return parseMarketplaceResponse<MarketplaceOrder>(response);
}

export async function createMarketplaceOrder(
  accessToken: string,
  payload: Record<string, unknown>
) {
  const response = await apiFetch(marketplaceUrl('/orders'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return parseMarketplaceResponse<MarketplaceOrder>(response);
}

export async function completeMarketplacePayment(
  accessToken: string,
  orderId: string,
  payload: Record<string, unknown>
) {
  const response = await apiFetch(
    marketplaceUrl(`/orders/${encodeURIComponent(orderId)}/payments/complete`),
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return parseMarketplaceResponse<{
    order: MarketplaceOrder;
    receipt?: unknown;
    alreadyCompleted?: boolean;
  }>(response);
}

export async function submitMarketplacePayment(
  accessToken: string,
  orderId: string,
  payload: Record<string, unknown>
) {
  const response = await apiFetch(
    marketplaceUrl(`/orders/${encodeURIComponent(orderId)}/payments/submit`),
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return parseMarketplaceResponse<{
    order: MarketplaceOrder;
    alreadyCompleted?: boolean;
  }>(response);
}

export async function updateMarketplaceShipping(
  accessToken: string,
  orderId: string,
  payload: Record<string, unknown>
) {
  const response = await apiFetch(
    marketplaceUrl(`/orders/${encodeURIComponent(orderId)}/shipping`),
    {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return parseMarketplaceResponse<MarketplaceOrder>(response);
}

export async function confirmMarketplaceReceipt(
  accessToken: string,
  orderId: string,
  payload: Record<string, unknown> = {}
) {
  const response = await apiFetch(
    marketplaceUrl(`/orders/${encodeURIComponent(orderId)}/confirm-receipt`),
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return parseMarketplaceResponse<MarketplaceOrder>(response);
}

export async function getMarketplaceReceipt(
  accessToken: string,
  orderId: string
) {
  const response = await apiFetch(
    marketplaceUrl(`/orders/${encodeURIComponent(orderId)}/receipt`),
    {
      headers: authHeaders(accessToken),
      cache: 'no-store',
    }
  );
  return parseMarketplaceResponse<{
    order: MarketplaceOrder;
    receipt?: unknown;
  }>(response);
}

export async function retryMarketplaceReceipt(
  accessToken: string,
  orderId: string
) {
  const response = await apiFetch(
    marketplaceUrl(`/orders/${encodeURIComponent(orderId)}/receipt/retry`),
    {
      method: 'POST',
      headers: authHeaders(accessToken),
    }
  );
  return parseMarketplaceResponse<{
    order: MarketplaceOrder;
    receipt?: unknown;
    alreadyMinted?: boolean;
  }>(response);
}

function filenameFromDisposition(header: string | null) {
  if (!header) return '';
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }
  const quotedMatch = header.match(/filename="?([^";]+)"?/i);
  return quotedMatch?.[1] ? quotedMatch[1] : '';
}

export async function downloadMarketplaceDigitalAsset(
  accessToken: string,
  orderId: string,
  productId: string
) {
  const response = await apiFetch(
    marketplaceUrl(
      `/orders/${encodeURIComponent(orderId)}/downloads/${encodeURIComponent(
        productId
      )}`
    ),
    {
      headers: authOnlyHeaders(accessToken),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiEnvelope<never>;
    throw new Error(
      body.message || body.error || `Digital download failed: ${response.status}`
    );
  }

  return {
    blob: await response.blob(),
    fileName:
      filenameFromDisposition(response.headers.get('content-disposition')) ||
      'swop-digital-download',
  };
}

export async function downloadMarketplaceDigitalAssetWithReceiptNft(
  publicReference: string,
  productId: string,
  payload: {
    walletAddress: string;
    issuedAt: string;
    message: string;
    signature: string;
  }
) {
  const response = await apiFetch(
    marketplaceUrl(
      `/public/receipts/${encodeURIComponent(
        publicReference
      )}/downloads/${encodeURIComponent(productId)}`
    ),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiEnvelope<never>;
    throw new Error(
      body.message || body.error || `Digital download failed: ${response.status}`
    );
  }

  return {
    blob: await response.blob(),
    fileName:
      filenameFromDisposition(response.headers.get('content-disposition')) ||
      'swop-digital-download',
  };
}
