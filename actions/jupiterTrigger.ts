'use server';

// Jupiter Trigger API (limit orders) — Solana only.
// Docs: https://dev.jup.ag/docs/trigger-api
// Pro host (api.jup.ag) is used when JUPITER_API_KEY is set, otherwise the
// keyless, rate-limited lite-api.jup.ag host is used as a fallback — mirrors
// the behaviour in actions/jupiterSwap.ts.

interface CreateTriggerOrderParams {
  inputMint: string;
  outputMint: string;
  maker: string;
  /** raw amount of inputMint (smallest units) the user gives */
  makingAmount: string;
  /** raw amount of outputMint (smallest units) the user wants */
  takingAmount: string;
  /** unix seconds (string) when the order expires; omit for no expiry */
  expiredAt?: string;
  slippageBps?: number;
}

interface ExecuteTriggerOrderParams {
  signedTransaction: string; // base64
  requestId: string;
}

interface CancelTriggerOrderParams {
  maker: string;
  order: string;
}

interface GetTriggerOrdersParams {
  user: string;
  orderStatus?: 'active' | 'history';
  page?: number;
}

const TRIGGER_TIMEOUT_MS = 10_000;

const getJupiterApiKey = () => process.env.JUPITER_API_KEY?.trim();

const triggerHosts = () => {
  const hosts: { base: string; headers: Record<string, string> }[] = [];
  const apiKey = getJupiterApiKey();
  if (apiKey) {
    hosts.push({
      base: 'https://api.jup.ag/trigger/v1',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    });
  }
  hosts.push({
    base: 'https://lite-api.jup.ag/trigger/v1',
    headers: { 'Content-Type': 'application/json' },
  });
  return hosts;
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = TRIGGER_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function errorFromStatus(status: number | undefined, data: any, fallback: string) {
  if (status === 429) {
    return 'Service is busy. Please wait a moment and try again.';
  }
  if (status === 404) {
    return 'This token pair is not available for limit orders.';
  }
  if (status && status >= 500) {
    return 'Limit order service is temporarily down. Please try again later.';
  }
  return data?.error || data?.errorMessage || fallback;
}

// Try each host in order, falling back on rate-limit / server errors.
async function triggerRequest(
  path: string,
  init: RequestInit,
  fallback: string
) {
  let response: Response | null = null;
  let data: any = null;
  const hosts = triggerHosts();
  for (const [index, host] of hosts.entries()) {
    try {
      response = await fetchWithTimeout(`${host.base}${path}`, {
        ...init,
        headers: { ...host.headers, ...(init.headers || {}) },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (index < hosts.length - 1) continue;
        return {
          success: false as const,
          error: 'Limit order request timed out. Please try again.',
        };
      }
      throw error;
    }
    data = await response.json().catch(() => null);
    if (response.ok) {
      return { success: true as const, data };
    }
    const retryable =
      response.status === 401 ||
      response.status === 403 ||
      response.status === 429 ||
      response.status >= 500;
    if (retryable && index < hosts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    break;
  }
  return {
    success: false as const,
    error: errorFromStatus(response?.status, data, fallback),
  };
}

export const createTriggerOrder = async (
  params: CreateTriggerOrderParams
) => {
  try {
    const {
      inputMint,
      outputMint,
      maker,
      makingAmount,
      takingAmount,
      expiredAt,
      slippageBps,
    } = params;

    const orderParams: Record<string, string> = {
      makingAmount,
      takingAmount,
    };
    if (expiredAt) orderParams.expiredAt = expiredAt;
    if (slippageBps !== undefined && Number.isFinite(slippageBps)) {
      orderParams.slippageBps = String(slippageBps);
    }

    const body: Record<string, unknown> = {
      inputMint,
      outputMint,
      maker,
      payer: maker,
      params: orderParams,
      computeUnitPrice: 'auto',
    };

    const result = await triggerRequest(
      '/createOrder',
      { method: 'POST', body: JSON.stringify(body) },
      'Unable to create limit order. Please try again.'
    );

    if (!result.success) return result;

    const data = result.data;
    if (!data?.transaction || !data?.requestId) {
      return {
        success: false as const,
        error:
          data?.error ||
          'Jupiter did not return a signable transaction for this order.',
      };
    }
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating Jupiter trigger order:', error);
    return {
      success: false as const,
      error: error?.message || 'Failed to create limit order',
    };
  }
};

export const executeTriggerOrder = async (
  params: ExecuteTriggerOrderParams
) => {
  try {
    const result = await triggerRequest(
      '/execute',
      { method: 'POST', body: JSON.stringify(params) },
      'Unable to submit limit order. Please try again.'
    );
    if (!result.success) return result;

    const data = result.data;
    if (data?.status === 'Failed') {
      return {
        success: false as const,
        error: String(data?.error || data?.code || 'Limit order failed.'),
      };
    }
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error executing Jupiter trigger order:', error);
    return {
      success: false as const,
      error: error?.message || 'Failed to submit limit order',
    };
  }
};

export const cancelTriggerOrder = async (
  params: CancelTriggerOrderParams
) => {
  try {
    const { maker, order } = params;
    const result = await triggerRequest(
      '/cancelOrder',
      {
        method: 'POST',
        body: JSON.stringify({ maker, order, computeUnitPrice: 'auto' }),
      },
      'Unable to cancel limit order. Please try again.'
    );
    if (!result.success) return result;

    const data = result.data;
    if (!data?.transaction || !data?.requestId) {
      return {
        success: false as const,
        error:
          data?.error ||
          'Jupiter did not return a signable cancellation transaction.',
      };
    }
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error cancelling Jupiter trigger order:', error);
    return {
      success: false as const,
      error: error?.message || 'Failed to cancel limit order',
    };
  }
};

export const getTriggerOrders = async (
  params: GetTriggerOrdersParams
) => {
  try {
    const { user, orderStatus = 'active', page } = params;
    const searchParams = new URLSearchParams({ user, orderStatus });
    if (page) searchParams.set('page', String(page));

    const result = await triggerRequest(
      `/getTriggerOrders?${searchParams.toString()}`,
      { method: 'GET' },
      'Unable to load limit orders. Please try again.'
    );
    if (!result.success) return result;

    const data = result.data;
    return {
      success: true as const,
      data: { orders: Array.isArray(data?.orders) ? data.orders : [], ...data },
    };
  } catch (error: any) {
    console.error('Error fetching Jupiter trigger orders:', error);
    return {
      success: false as const,
      error: error?.message || 'Failed to load limit orders',
    };
  }
};
