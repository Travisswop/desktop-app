export function agentStorageKey(masterAddress: string) {
  return `hl_agent_pk_${masterAddress.toLowerCase()}`;
}

function stableStorageId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function agentMasterStorageKey(privyUserId: string) {
  return `hl_agent_master_${stableStorageId(privyUserId)}`;
}

export function legacyAgentMasterStorageKey(privyUserId: string) {
  return `hl_agent_master_${privyUserId}`;
}

export function normalizeAgentValidUntilMs(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  // Hyperliquid may return this as seconds while Date.now() is milliseconds.
  // Anything below this threshold is not a plausible millisecond timestamp.
  if (numeric > 0 && numeric < 10_000_000_000) return numeric * 1000;
  return numeric;
}

export function isAgentApprovalActive(
  agent: { address?: string | null; validUntil?: unknown },
  agentAddress: string,
  nowMs = Date.now(),
) {
  if (
    !agent.address ||
    agent.address.toLowerCase() !== agentAddress.toLowerCase()
  ) {
    return false;
  }

  const validUntilMs = normalizeAgentValidUntilMs(agent.validUntil);
  return validUntilMs == null ? true : validUntilMs > nowMs;
}
