/**
 * backend-session.ts
 *
 * Client utilities for the polymarket-backend session API.
 *
 * All endpoints require a valid Bearer token (the Swop app JWT stored in
 * UserContext.accessToken).  Both the polymarket-backend and swop-app-backend
 * share the same JWT_SECRET, so the same token works for both services.
 */

import { POLYMARKET_BACKEND_PROXY_URL } from "@/constants/polymarket";

export interface ClobCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface CredentialTypedData {
  typedData: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    /** For deposit-wallet flows this is "TypedDataSign". */
    primaryType?: string;
    message: Record<string, unknown>;
  };
  timestamp: string;
  nonce: number;
  /** Echoed back so the frontend can route the signature correctly. */
  walletType?: "eoa" | "safe" | "deposit";
  /** Only present for the deposit-wallet flow. */
  depositWalletAddress?: string;
}

export type ClobCredentialWalletType = "eoa" | "safe" | "deposit";

interface CredentialFlowOptions {
  walletType?: ClobCredentialWalletType;
  depositWalletAddress?: string;
}

export interface DeployTypedData {
  typedData: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    message: Record<string, unknown>;
  };
  safeAddress: string;
  eoaAddress: string;
}

export interface ApprovalTypedData {
  typedData?: Record<string, unknown>;
  txHash?: string;
  safeAddress: string;
  nonce: string;
  to: string;
  data: string;
  operation: number;
  alreadyApproved?: boolean;
}

export interface DepositWalletApprovalTypedData {
  typedData?: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    primaryType?: string;
    message: Record<string, unknown>;
  };
  depositWalletAddress: string;
  eoaAddress: string;
  nonce: string;
  deadline: string;
  calls: Array<{ target: string; value: string; data: string }>;
  alreadyApproved?: boolean;
}

const base = () => POLYMARKET_BACKEND_PROXY_URL;
const REDEEM_TYPED_DATA_TIMEOUT_MS = 30000;
const REDEEM_SUBMIT_TIMEOUT_MS = 120000;

function authHeaders(accessToken: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retries a network operation on transient failures (network errors or HTTP
 * 5xx). If fn() returns a value without throwing — e.g. null for a definitive
 * 404 — that value is returned immediately with no retry. Throws the last
 * error once retries are exhausted.
 *
 * This exists so silent session restore never mistakes a transient blip for
 * "no credentials" / "not deployed" and re-prompts a user who is already set up.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 400,
    shouldRetry = () => true,
  }: {
    retries?: number;
    baseDelayMs?: number;
    shouldRetry?: (err: unknown) => boolean;
  } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries && shouldRetry(err)) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Retry network/5xx errors but not 4xx (a 400/401/403 won't fix itself on retry).
const retryTransientHttp = (err: unknown): boolean => {
  const status = (err as { status?: number })?.status;
  return status === undefined || status >= 500;
};

/**
 * Build the credential-endpoint query string with optional wallet routing.
 *
 * CLOB credentials are bound to the signer EOA. Deposit-wallet details are
 * still included so backend endpoints can route orders through the deposit
 * wallet.
 */
function buildCredentialQuery(
  eoaAddress: string,
  opts: CredentialFlowOptions | undefined
): string {
  const params = new URLSearchParams({ eoaAddress });
  if (opts?.walletType) params.set("walletType", opts.walletType);
  if (opts?.depositWalletAddress) {
    params.set("depositWalletAddress", opts.depositWalletAddress);
  }
  return params.toString();
}

/**
 * Fetches server-cached API credentials for the given wallet binding.
 * Returns null when the cache is empty (e.g. after a server restart).
 * A null result means the caller must go through the full sign-and-derive flow.
 */
export async function fetchCachedCredentials(
  eoaAddress: string,
  accessToken: string,
  opts?: CredentialFlowOptions
): Promise<ClobCredentials | null> {
  try {
    return await withRetry(async () => {
      const res = await fetch(
        `${base()}/session/credentials?${buildCredentialQuery(eoaAddress, opts)}`,
        { headers: authHeaders(accessToken) }
      );

      // 404 and incomplete payloads are definitive "no usable creds" — return
      // null without retrying. Other non-ok responses are transient: throw so
      // withRetry can retry rather than reporting a false cache miss.
      if (res.status === 404) return null;
      if (!res.ok) {
        const err = new Error(`credentials fetch failed (${res.status})`);
        (err as { status?: number }).status = res.status;
        throw err;
      }

      const data = await res.json();
      if (!data.key || !data.secret || !data.passphrase) return null;
      return { key: data.key, secret: data.secret, passphrase: data.passphrase };
    }, { shouldRetry: retryTransientHttp });
  } catch {
    return null;
  }
}

/**
 * Returns the EIP-712 typed data that the wallet must sign to derive API credentials.
 * Pass the result's { typedData, timestamp, nonce } to the wallet for signing,
 * then send the signature to deriveAndCacheCredentials().
 *
 * Credential derivation uses raw ClobAuth signed by the owner EOA.
 */
export async function getCredentialTypedData(
  eoaAddress: string,
  accessToken: string,
  opts?: CredentialFlowOptions
): Promise<CredentialTypedData> {
  const res = await fetch(
    `${base()}/session/credential-typed-data?${buildCredentialQuery(eoaAddress, opts)}`,
    { headers: authHeaders(accessToken) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get credential typed data");
  }

  return res.json();
}

/**
 * Derives API credentials from the user's signed ClobAuth message via the
 * polymarket-backend, which forwards to Polymarket's L1 endpoints. The
 * backend keeps the credential flow server-side.
 *
 * We POST through our backend rather than calling CLOB directly from the
 * browser.
 */
export async function deriveAndCacheCredentials(
  eoaAddress: string,
  signature: string,
  timestamp: string,
  nonce: number,
  accessToken: string,
  opts?: CredentialFlowOptions
): Promise<ClobCredentials> {
  const res = await fetch(`${base()}/session/credentials`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      eoaAddress,
      signature,
      timestamp,
      nonce,
      ...(opts?.walletType ? { walletType: opts.walletType } : {}),
      ...(opts?.depositWalletAddress
        ? { depositWalletAddress: opts.depositWalletAddress }
        : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error ||
        err.message ||
        `polymarket-backend returned ${res.status} deriving credentials`
    );
  }

  const data = await res.json();
  if (!data.key || !data.secret || !data.passphrase) {
    throw new Error("polymarket-backend returned incomplete credentials");
  }
  return { key: data.key, secret: data.secret, passphrase: data.passphrase };
}

/**
 * Returns the EIP-712 typed data for Safe deployment.
 * The wallet signs typedData with primaryType "CreateProxy"; the signature is
 * then submitted via submitDeploySignature().
 *
 * ⚠️  CLIENT-SIDE SIGNING REQUIRED — Polymarket's relayer verifies this
 * signature against the Safe owner's EOA. Cannot be moved server-side.
 */
export async function getDeployTypedData(
  eoaAddress: string,
  accessToken: string
): Promise<DeployTypedData> {
  const res = await fetch(
    `${base()}/session/deploy-typed-data?eoaAddress=${encodeURIComponent(eoaAddress)}`,
    { headers: authHeaders(accessToken) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get deploy typed data");
  }

  return res.json();
}

/**
 * Submits a Safe deployment to the Polymarket relayer.
 * Pass the EIP-712 signature produced by signing the data from getDeployTypedData().
 *
 * ⚠️  CLIENT-SIDE SIGNING REQUIRED — see getDeployTypedData.
 */
export async function submitDeploySignature(
  eoaAddress: string,
  signature: string,
  accessToken: string
): Promise<{ deployed: boolean; safeAddress: string; txId?: string }> {
  const res = await fetch(`${base()}/session/deploy-safe`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ eoaAddress, signature }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to deploy Safe");
  }

  return res.json();
}

export interface PolymarketWalletInfo {
  eoaAddress: string;
  safeAddress: string;
  safeDeployed: boolean;
  depositWalletAddress: string;
  depositWalletDeployed: boolean;
  recommendedWalletType: "safe" | "deposit";
}

/**
 * Returns the wallet state Polymarket recognises for this EOA. Legacy users
 * with a deployed Safe must keep using signatureType=2 — Polymarket does not
 * auto-migrate them to deposit wallets, so trying to place a POLY_1271 order
 * under a Safe-bound EOA fails with the legacy signer-mismatch error.
 */
export async function getWalletInfo(
  eoaAddress: string,
  accessToken: string
): Promise<PolymarketWalletInfo> {
  const params = new URLSearchParams({ eoaAddress });
  return withRetry(async () => {
    const res = await fetch(`${base()}/session/wallet-info?${params}`, {
      headers: authHeaders(accessToken),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || "Failed to resolve wallet info");
      (err as { status?: number }).status = res.status;
      throw err;
    }

    return res.json();
  }, { shouldRetry: retryTransientHttp });
}

export async function getDepositWalletAddress(
  eoaAddress: string,
  accessToken: string
): Promise<{ depositWalletAddress: string }> {
  const params = new URLSearchParams({ eoaAddress });
  const res = await fetch(`${base()}/session/deposit-wallet-address?${params}`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to derive deposit wallet address");
  }

  return res.json();
}

export async function deployDepositWallet(
  eoaAddress: string,
  accessToken: string,
  options?: { force?: boolean }
): Promise<{
  deployed: boolean;
  depositWalletAddress: string;
  alreadyExisted?: boolean;
  txId?: string;
}> {
  const res = await fetch(`${base()}/session/deploy-deposit-wallet`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      eoaAddress,
      ...(options?.force ? { force: true } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to deploy deposit wallet");
  }

  return res.json();
}

/**
 * Returns the SafeTx EIP-712 data that the wallet must sign to authorise the
 * token approval batch.  Returns { alreadyApproved: true } when no action
 * is needed.
 *
 * ⚠️  CLIENT-SIDE SIGNING REQUIRED — Polymarket's relayer verifies this
 * signature against the Safe owner's EOA. Cannot be moved server-side.
 */
export async function getApprovalTypedData(
  safeAddress: string,
  eoaAddress: string,
  accessToken: string
): Promise<ApprovalTypedData> {
  const params = new URLSearchParams({ safeAddress, eoaAddress });
  const res = await fetch(
    `${base()}/session/approval-typed-data?${params}`,
    { headers: authHeaders(accessToken) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get approval typed data");
  }

  return res.json();
}

/**
 * Submits the user-signed token approval batch to the Polymarket relayer.
 *
 * ⚠️  CLIENT-SIDE SIGNING REQUIRED — see getApprovalTypedData.
 */
export async function submitApprovalSignature(
  params: {
    safeAddress: string;
    eoaAddress: string;
    signature: string;
    nonce: string;
    to: string;
    data: string;
    operation: number;
  },
  accessToken: string
): Promise<{ approvalsComplete: boolean }> {
  const res = await fetch(`${base()}/session/approvals`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit approvals");
  }

  return res.json();
}

export async function getDepositWalletApprovalTypedData(
  depositWalletAddress: string,
  eoaAddress: string,
  accessToken: string
): Promise<DepositWalletApprovalTypedData> {
  const params = new URLSearchParams({ depositWalletAddress, eoaAddress });
  const res = await fetch(
    `${base()}/session/deposit-wallet/approval-typed-data?${params}`,
    { headers: authHeaders(accessToken) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get deposit wallet approval typed data");
  }

  return res.json();
}

export async function submitDepositWalletApprovalSignature(
  params: {
    depositWalletAddress: string;
    eoaAddress: string;
    signature: string;
    nonce: string;
    deadline: string;
    calls: Array<{ target: string; value: string; data: string }>;
  },
  accessToken: string
): Promise<{ approvalsComplete: boolean }> {
  const res = await fetch(`${base()}/session/deposit-wallet/approvals`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit deposit wallet approvals");
  }

  return res.json();
}

export async function syncBalanceAllowance(
  params: {
    apiCreds: ClobCredentials;
    safeAddress?: string;
    depositWalletAddress?: string;
    walletType?: "safe" | "deposit";
    eoaAddress: string;
    assetType?: "COLLATERAL" | "CONDITIONAL";
    tokenId?: string;
  },
  accessToken: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${base()}/session/balance-allowance/sync`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to sync balance allowance");
  }

  return res.json();
}

export interface WithdrawTypedData {
  txHash?: string;
  typedData?: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    primaryType?: string;
    message: Record<string, unknown>;
  };
  safeAddress?: string;
  depositWalletAddress?: string;
  eoaAddress: string;
  nonce: string;
  deadline?: string;
  calls?: Array<{ target: string; value: string; data: string }>;
  to?: string;
  data?: string;
  operation?: number;
}

export async function getWithdrawTypedData(
  params: {
    safeAddress: string;
    depositWalletAddress?: string;
    walletType?: "safe" | "deposit";
    eoaAddress: string;
    toAddress: string;
    amount: number;
    tokenAddress?: string;
  },
  accessToken: string
): Promise<WithdrawTypedData> {
  const searchParams = new URLSearchParams({
    safeAddress: params.safeAddress,
    eoaAddress: params.eoaAddress,
    toAddress: params.toAddress,
    amount: String(params.amount),
    ...(params.depositWalletAddress ? { depositWalletAddress: params.depositWalletAddress } : {}),
    ...(params.walletType ? { walletType: params.walletType } : {}),
    ...(params.tokenAddress ? { tokenAddress: params.tokenAddress } : {}),
  });
  const res = await fetch(`${base()}/positions/withdraw/typed-data?${searchParams}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get withdraw typed data');
  }
  return res.json();
}

export async function submitWithdraw(
  params: {
    safeAddress: string;
    depositWalletAddress?: string;
    walletType?: "safe" | "deposit";
    eoaAddress: string;
    toAddress: string;
    amount: number;
    signature: string;
    nonce: string;
    deadline?: string;
    tokenAddress?: string;
  },
  accessToken: string
): Promise<{ txId: string; success: boolean }> {
  const res = await fetch(`${base()}/positions/withdraw`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Withdrawal failed');
  }
  return res.json();
}

export interface LegacyWithdrawTypedData {
  txHash: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: string;
}

export async function getLegacyWithdrawTypedData(
  params: {
    safeAddress: string;
    toAddress: string;
    amount: number;
    tokenAddress?: string;
  },
  accessToken: string
): Promise<LegacyWithdrawTypedData> {
  const searchParams = new URLSearchParams({
    safeAddress: params.safeAddress,
    toAddress: params.toAddress,
    amount: String(params.amount),
    ...(params.tokenAddress ? { tokenAddress: params.tokenAddress } : {}),
  });
  const res = await fetch(`${base()}/positions/withdraw/direct/typed-data?${searchParams}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get withdraw typed data');
  }
  return res.json();
}

export interface RedeemTypedData {
  txHash?: string;
  typedData?: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    primaryType?: string;
    message: Record<string, unknown>;
  };
  safeAddress?: string;
  depositWalletAddress?: string;
  eoaAddress: string;
  nonce: string;
  deadline?: string;
  calls?: Array<{ target: string; value: string; data: string }>;
  to?: string;
  data?: string;
  operation?: number;
  collateralToken?: string;
  shouldWrapCollateral?: boolean;
}

export interface DepositWalletWrapTypedData {
  typedData: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    primaryType?: string;
    message: Record<string, unknown>;
  };
  depositWalletAddress: string;
  eoaAddress: string;
  nonce: string;
  deadline: string;
  calls: Array<{ target: string; value: string; data: string }>;
  amount: number;
  sourceCollateralToken: string;
  destinationCollateralToken: string;
}

export async function getRedeemTypedData(
  params: {
    safeAddress: string;
    depositWalletAddress?: string;
    walletType?: "safe" | "deposit";
    eoaAddress: string;
    conditionId: string;
    asset?: string;
    negRisk?: boolean;
    outcomeIndex?: number;
    size?: number;
  },
  accessToken: string
): Promise<RedeemTypedData> {
  const searchParams = new URLSearchParams({
    safeAddress: params.safeAddress,
    eoaAddress: params.eoaAddress,
    conditionId: params.conditionId,
    ...(params.asset ? { asset: params.asset } : {}),
    ...(params.depositWalletAddress ? { depositWalletAddress: params.depositWalletAddress } : {}),
    ...(params.walletType ? { walletType: params.walletType } : {}),
    ...(params.negRisk != null ? { negRisk: String(params.negRisk) } : {}),
    ...(params.outcomeIndex != null ? { outcomeIndex: String(params.outcomeIndex) } : {}),
    ...(params.size != null ? { size: String(params.size) } : {}),
  });
  const res = await fetchWithTimeout(
    `${base()}/positions/redeem/typed-data?${searchParams}`,
    {
      headers: authHeaders(accessToken),
    },
    REDEEM_TYPED_DATA_TIMEOUT_MS,
    'Redeem setup timed out. Please check your bets and try again.',
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get redeem typed data');
  }
  return res.json();
}

export async function submitRedeem(
  params: {
    safeAddress: string;
    depositWalletAddress?: string;
    walletType?: "safe" | "deposit";
    eoaAddress: string;
    conditionId: string;
    asset?: string;
    negRisk?: boolean;
    outcomeIndex?: number;
    size?: number;
    signature: string;
    nonce: string;
    deadline?: string;
  },
  accessToken: string
): Promise<{
  txId: string;
  success: boolean;
  error?: string;
  collateralToken?: string;
  shouldWrapCollateral?: boolean;
  redeemedAmount?: number;
}> {
  const res = await fetchWithTimeout(
    `${base()}/positions/redeem`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(params),
    },
    REDEEM_SUBMIT_TIMEOUT_MS,
    'Redeem confirmation timed out. Refresh your bets before trying again.',
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Redemption failed');
  }
  if (data.success === false) {
    throw new Error(data.error || 'Redemption failed on-chain');
  }
  return data;
}

export async function getDepositWalletWrapTypedData(
  params: {
    depositWalletAddress: string;
    eoaAddress: string;
    destinationAddress?: string;
    amount: number;
  },
  accessToken: string,
): Promise<DepositWalletWrapTypedData> {
  const searchParams = new URLSearchParams({
    depositWalletAddress: params.depositWalletAddress,
    eoaAddress: params.eoaAddress,
    amount: String(params.amount),
    ...(params.destinationAddress
      ? { destinationAddress: params.destinationAddress }
      : {}),
  });
  const res = await fetch(`${base()}/wrap/deposit-wallet/typed-data?${searchParams}`, {
    headers: authHeaders(accessToken),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to get USDC.e conversion typed data');
  }
  return res.json();
}

export async function submitDepositWalletWrap(
  params: {
    depositWalletAddress: string;
    eoaAddress: string;
    destinationAddress?: string;
    amount: number;
    signature: string;
    nonce: string;
    deadline: string;
  },
  accessToken: string,
): Promise<{ txId: string; success: boolean; transactionHash?: string }> {
  const res = await fetch(`${base()}/wrap/deposit-wallet`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'USDC.e conversion failed');
  }
  if (data.success === false) {
    throw new Error(data.error || 'USDC.e conversion failed on-chain');
  }
  return data;
}

/**
 * Submits a pre-signed Gnosis Safe execTransaction calldata to Polygon via
 * the backend's funded relay wallet.
 *
 * Used for USDC.e → pUSD wrapping because the Polymarket relayer rejects
 * legacy USDC.e, and Privy v3.18 crashes on eth_sendTransaction from the
 * frontend (SignRequestScreen bug).
 *
 * The signature must already be packed into execCalldata before calling this.
 */
export async function relayWrapExecTransaction(
  safeAddress: string,
  execCalldata: `0x${string}`,
  accessToken: string,
): Promise<{ txHash: `0x${string}` }> {
  const res = await fetch(`${base()}/wrap/relay`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ safeAddress, execCalldata }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Wrap relay failed');
  }
  return res.json();
}
