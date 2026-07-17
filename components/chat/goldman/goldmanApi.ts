// Fetch helpers for the Goldman Sacks trust-UX endpoints (brain controls and
// the activity ledger). These endpoints ship from a parallel backend branch,
// so every helper feature-detects: a 404 (or missing payload) resolves to an
// "unsupported" result instead of throwing, and callers hide the UI.
// Mirrors the auth/fetch pattern used by readGoldmanStrategyVault in
// components/chat/ChatArea.tsx.

import { apiFetch } from '@/lib/api/apiFetch';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import type {
  GoldmanActivityEntry,
  GoldmanAutonomyLevel,
  GoldmanAutonomyResult,
  GoldmanBrainState,
} from './goldmanTypes';

function goldmanAgentUrl(groupId: string, suffix: string) {
  return buildSwopApiUrl(
    `/api/v5/messages/groups/${encodeURIComponent(
      groupId
    )}/agents/goldman-sacks${suffix}`
  );
}

function authHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` };
}

async function parseBody(response: Response) {
  return response.json().catch(() => null);
}

function extractBrainState(body: unknown): GoldmanBrainState | null {
  const data = (body as { data?: unknown } | null)?.data;
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const brain =
    record.brain && typeof record.brain === 'object'
      ? (record.brain as GoldmanBrainState)
      : (record as GoldmanBrainState);
  return brain && typeof brain === 'object' ? brain : null;
}

export async function fetchGoldmanBrain({
  groupId,
  accessToken,
}: {
  groupId: string;
  accessToken: string;
}): Promise<GoldmanBrainState | null> {
  const response = await apiFetch(goldmanAgentUrl(groupId, '/brain'), {
    headers: authHeaders(accessToken),
  });

  // 404 = backend has not shipped brain controls yet; hide the section.
  if (response.status === 404) return null;

  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(
      (body as { message?: string } | null)?.message ||
        `Goldman brain request failed (${response.status})`
    );
  }

  return extractBrainState(body);
}

export async function updateGoldmanBrain({
  groupId,
  accessToken,
  patch,
}: {
  groupId: string;
  accessToken: string;
  patch: {
    tier?: 'fast' | 'deep';
    memoryEnabled?: boolean;
    feedSharingEnabled?: boolean;
  };
}): Promise<GoldmanBrainState | null> {
  const response = await apiFetch(goldmanAgentUrl(groupId, '/brain'), {
    method: 'PATCH',
    headers: {
      ...authHeaders(accessToken),
      'content-type': 'application/json',
    },
    body: JSON.stringify(patch),
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(
      (body as { message?: string } | null)?.message ||
        `Goldman brain update failed (${response.status})`
    );
  }

  return extractBrainState(body);
}

export async function resetGoldmanBrainMemory({
  groupId,
  accessToken,
}: {
  groupId: string;
  accessToken: string;
}): Promise<void> {
  const response = await apiFetch(
    goldmanAgentUrl(groupId, '/brain/memory-reset'),
    {
      method: 'POST',
      headers: authHeaders(accessToken),
    }
  );

  if (!response.ok) {
    const body = await parseBody(response);
    throw new Error(
      (body as { message?: string } | null)?.message ||
        `Goldman memory reset failed (${response.status})`
    );
  }
}

export type GoldmanAutonomyUpdate = {
  supported: boolean;
  result: GoldmanAutonomyResult | null;
};

// One-shot full-autonomy switch. `level: 'full'` opens the venue gates so
// strategies can trade without per-action approval; `level: 'proposal'` puts
// them back to asking first. A 404 means the backend has not shipped this
// endpoint yet — callers hide the control.
export async function updateGoldmanAutonomy({
  groupId,
  accessToken,
  level,
}: {
  groupId: string;
  accessToken: string;
  level: GoldmanAutonomyLevel;
}): Promise<GoldmanAutonomyUpdate> {
  const response = await apiFetch(goldmanAgentUrl(groupId, '/autonomy'), {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ level }),
  });

  if (response.status === 404) {
    return { supported: false, result: null };
  }

  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(
      (body as { message?: string } | null)?.message ||
        `Goldman autonomy update failed (${response.status})`
    );
  }

  const data = (body as { data?: GoldmanAutonomyResult } | null)?.data;
  return { supported: true, result: data ?? null };
}

export type GoldmanActivityPage = {
  supported: boolean;
  entries: GoldmanActivityEntry[];
};

export async function fetchGoldmanActivity({
  groupId,
  accessToken,
  limit = 50,
  before,
}: {
  groupId: string;
  accessToken: string;
  limit?: number;
  before?: string;
}): Promise<GoldmanActivityPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (before) query.set('before', before);

  const response = await apiFetch(
    goldmanAgentUrl(groupId, `/activity?${query.toString()}`),
    {
      headers: authHeaders(accessToken),
    }
  );

  // 404 = activity ledger not shipped yet; caller falls back to the
  // client-side session feed.
  if (response.status === 404) {
    return { supported: false, entries: [] };
  }

  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(
      (body as { message?: string } | null)?.message ||
        `Goldman activity request failed (${response.status})`
    );
  }

  const data = (body as { data?: { entries?: unknown } } | null)?.data;
  const candidateEntries = data?.entries;
  const rawEntries: unknown[] = Array.isArray(candidateEntries)
    ? candidateEntries
    : [];
  const entries = rawEntries.filter(
    (entry): entry is GoldmanActivityEntry =>
      Boolean(entry) && typeof entry === 'object'
  );

  return { supported: true, entries };
}

export type GoldmanVaultWithdrawResult = {
  transactionHash: string;
  chain: string;
  chainId: number;
  token: {
    symbol: string;
    address: string | null;
    isNative: boolean;
    decimals: number;
  };
  amount: number;
  amountRaw: string;
  to: string;
  vaultAddress: string;
};

/**
 * Withdraw liquid vault funds back to the owner's main wallet. The backend
 * resolves the destination from the authenticated user server-side — the
 * client only picks which vault holding (chain + token) and how much.
 * `isMax: true` withdraws the full balance (minus float-safety headroom).
 */
export async function withdrawGoldmanVault({
  groupId,
  accessToken,
  chain,
  tokenAddress,
  symbol,
  amount,
  isMax = false,
}: {
  groupId: string;
  accessToken: string;
  chain: string;
  tokenAddress?: string | null;
  symbol?: string | null;
  amount?: number;
  isMax?: boolean;
}): Promise<GoldmanVaultWithdrawResult> {
  const response = await apiFetch(
    goldmanAgentUrl(groupId, '/strategy-vault/withdraw'),
    {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        chain,
        tokenAddress: tokenAddress || null,
        symbol: symbol || null,
        amount,
        isMax,
      }),
    }
  );

  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(
      (body as { message?: string } | null)?.message ||
        `Vault withdrawal failed (${response.status})`
    );
  }

  const data = (body as { data?: GoldmanVaultWithdrawResult } | null)?.data;
  if (!data?.transactionHash) {
    throw new Error('Vault withdrawal did not return a transaction.');
  }
  return data;
}
