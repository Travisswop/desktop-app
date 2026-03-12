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
