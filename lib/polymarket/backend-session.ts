/**
 * backend-session.ts
 *
 * Client utilities for the polymarket-backend session API.
 *
 * All endpoints require a valid Bearer token (the Swop app JWT stored in
 * UserContext.accessToken).  Both the polymarket-backend and swop-app-backend
 * share the same JWT_SECRET, so the same token works for both services.
 */

import { POLYMARKET_BACKEND_URL } from "@/constants/polymarket";

export interface ClobCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface CredentialTypedData {
  typedData: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    message: Record<string, unknown>;
  };
  timestamp: string;
  nonce: number;
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

const base = () => `${POLYMARKET_BACKEND_URL}/api/prediction-markets`;

function authHeaders(accessToken: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * Fetches server-cached API credentials for the given EOA.
 * Returns null when the cache is empty (e.g. after a server restart).
 * A null result means the caller must go through the full sign-and-derive flow.
 */
export async function fetchCachedCredentials(
  eoaAddress: string,
  accessToken: string
): Promise<ClobCredentials | null> {
  try {
    const res = await fetch(
      `${base()}/session/credentials?eoaAddress=${encodeURIComponent(eoaAddress)}`,
      { headers: authHeaders(accessToken) }
    );

    if (res.status === 404) return null;
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.key || !data.secret || !data.passphrase) return null;
    return { key: data.key, secret: data.secret, passphrase: data.passphrase };
  } catch {
    return null;
  }
}

/**
 * Returns the EIP-712 typed data that the wallet must sign to derive API credentials.
 * Pass the result's { typedData, timestamp, nonce } to the wallet for signing,
 * then send the signature to deriveAndCacheCredentials().
 */
export async function getCredentialTypedData(
  eoaAddress: string,
  accessToken: string
): Promise<CredentialTypedData> {
  const res = await fetch(
    `${base()}/session/credential-typed-data?eoaAddress=${encodeURIComponent(eoaAddress)}`,
    { headers: authHeaders(accessToken) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get credential typed data");
  }

  return res.json();
}

/**
 * Derives API credentials from the user's EIP-712 signature and stores them
 * in the server-side cache so future logins skip re-signing.
 */
export async function deriveAndCacheCredentials(
  eoaAddress: string,
  signature: string,
  timestamp: string,
  nonce: number,
  accessToken: string
): Promise<ClobCredentials> {
  const res = await fetch(`${base()}/session/credentials`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ eoaAddress, signature, timestamp, nonce }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to derive credentials");
  }

  const data = await res.json();
  if (!data.key || !data.secret || !data.passphrase) {
    throw new Error("Backend returned incomplete credentials");
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

export interface WithdrawTypedData {
  txHash: string;
  safeAddress: string;
  eoaAddress: string;
  nonce: string;
  to: string;
  data: string;
  operation: number;
}

export async function getWithdrawTypedData(
  params: {
    safeAddress: string;
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
    eoaAddress: string;
    toAddress: string;
    amount: number;
    signature: string;
    nonce: string;
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
  txHash: string;
  safeAddress: string;
  eoaAddress: string;
  nonce: string;
  to: string;
  data: string;
  operation: number;
}

export async function getRedeemTypedData(
  params: {
    safeAddress: string;
    eoaAddress: string;
    conditionId: string;
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
    ...(params.negRisk != null ? { negRisk: String(params.negRisk) } : {}),
    ...(params.outcomeIndex != null ? { outcomeIndex: String(params.outcomeIndex) } : {}),
    ...(params.size != null ? { size: String(params.size) } : {}),
  });
  const res = await fetch(`${base()}/positions/redeem/typed-data?${searchParams}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get redeem typed data');
  }
  return res.json();
}

export async function submitRedeem(
  params: {
    safeAddress: string;
    eoaAddress: string;
    conditionId: string;
    negRisk?: boolean;
    outcomeIndex?: number;
    size?: number;
    signature: string;
    nonce: string;
  },
  accessToken: string
): Promise<{ txId: string; success: boolean }> {
  const res = await fetch(`${base()}/positions/redeem`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Redemption failed');
  }
  return res.json();
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
