'use server';

import {
  JUPITER_VERIFIED_TOKEN_TAG_URL,
  ONDO_GLOBAL_MARKETS_TOKEN_LIST_URL,
  dedupeOndoGlobalMarketsTokens,
  normalizeJupiterOndoToken,
  normalizeOndoTokenListToken,
  type OndoGlobalMarketsToken,
} from '@/lib/wallet/ondoGlobalMarkets';

const ONDO_TOKEN_CACHE_TTL_MS = 10 * 60 * 1000;
const ONDO_TOKEN_FETCH_TIMEOUT_MS = 12_000;

let cachedOndoGlobalMarketsTokens:
  | {
      tokens: OndoGlobalMarketsToken[];
      ts: number;
    }
  | undefined;

async function fetchJsonWithTimeout(url: string, headers?: HeadersInit) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ONDO_TOKEN_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(headers || {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Ondo token source failed: ${response.status}`,
      );
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOndoTokenListTokens() {
  const tokenList = await fetchJsonWithTimeout(
    ONDO_GLOBAL_MARKETS_TOKEN_LIST_URL,
  );
  const tokens = Array.isArray(tokenList?.tokens)
    ? tokenList.tokens
    : [];

  return tokens
    .map(normalizeOndoTokenListToken)
    .filter(Boolean) as OndoGlobalMarketsToken[];
}

async function fetchSolanaOndoTokens() {
  const headers: Record<string, string> = {};
  if (process.env.JUPITER_API_KEY) {
    headers['x-api-key'] = process.env.JUPITER_API_KEY;
  }

  const tokenList = await fetchJsonWithTimeout(
    JUPITER_VERIFIED_TOKEN_TAG_URL,
    headers,
  );
  const tokens = Array.isArray(tokenList) ? tokenList : [];

  return tokens
    .map(normalizeJupiterOndoToken)
    .filter(Boolean) as OndoGlobalMarketsToken[];
}

export async function fetchOndoGlobalMarketsTokens() {
  if (
    cachedOndoGlobalMarketsTokens &&
    Date.now() - cachedOndoGlobalMarketsTokens.ts <
      ONDO_TOKEN_CACHE_TTL_MS
  ) {
    return cachedOndoGlobalMarketsTokens.tokens;
  }

  const [evmResult, solanaResult] = await Promise.allSettled([
    fetchOndoTokenListTokens(),
    fetchSolanaOndoTokens(),
  ]);

  const evmTokens =
    evmResult.status === 'fulfilled' ? evmResult.value : [];
  const solanaTokens =
    solanaResult.status === 'fulfilled' ? solanaResult.value : [];
  const tokens = dedupeOndoGlobalMarketsTokens([
    ...solanaTokens,
    ...evmTokens,
  ]);

  if (tokens.length > 0) {
    cachedOndoGlobalMarketsTokens = {
      tokens,
      ts: Date.now(),
    };
  }

  return tokens;
}
