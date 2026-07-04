/**
 * Pure helpers for surfacing the SWOP-token gate to the user when an agent
 * invocation is blocked. The backend emits `agent_group_response` with an
 * `error` payload when a user tries to invoke a gated agent without enough
 * SWOP (or when the balance check times out / fails). These helpers classify
 * that payload and normalize it into the values the in-chat notice renders,
 * so ChatArea never has to string-parse the human-readable message.
 */

export type SwopAccessErrorCode =
  | 'AGENT_SWOP_BALANCE_REQUIRED'
  | 'AGENT_SWOP_BALANCE_CHECK_TIMEOUT'
  | 'AGENT_SWOP_BALANCE_CHECK_FAILED';

export interface AgentGroupError {
  code?: string;
  message?: string;
  details?: {
    agentId?: unknown;
    agentName?: unknown;
    requiredSwop?: unknown;
    currentSwop?: unknown;
    deficitSwop?: unknown;
    swopMint?: unknown;
    buyMoreSwop?: unknown;
    [key: string]: unknown;
  };
}

const BALANCE_REQUIRED_CODE: SwopAccessErrorCode = 'AGENT_SWOP_BALANCE_REQUIRED';
const CHECK_TIMEOUT_CODE: SwopAccessErrorCode = 'AGENT_SWOP_BALANCE_CHECK_TIMEOUT';
const CHECK_FAILED_CODE: SwopAccessErrorCode = 'AGENT_SWOP_BALANCE_CHECK_FAILED';

/**
 * True when the error is one of the SWOP-gate codes (or carries the legacy
 * `buyMoreSwop` detail flag). These are the payloads we surface in-thread.
 */
export function isSwopAccessError(error?: AgentGroupError | null): boolean {
  return (
    error?.code === BALANCE_REQUIRED_CODE ||
    error?.code === CHECK_TIMEOUT_CODE ||
    error?.code === CHECK_FAILED_CODE ||
    Boolean(error?.details?.buyMoreSwop)
  );
}

/** Stringify a detail value, falling back when it's missing/empty. */
export function swopAccessValue(value: unknown, fallback: string): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export type SwopAccessNoticeVariant = 'locked' | 'check_failed';

export interface SwopAccessNotice {
  variant: SwopAccessNoticeVariant;
  agentName: string;
  requiredSwop: string;
  currentSwop: string;
  deficitSwop: string;
  swopMint: string | null;
  message: string;
  /** Whether a "Buy SWOP" action should be offered (locked variant only). */
  canBuySwop: boolean;
}

/**
 * Normalize a gate error into the structured values the in-chat notice needs.
 * `fallbackAgentName` is used when the backend didn't include `details.agentName`
 * (e.g. resolved from the group's bot roster or a generic "Agent").
 */
export function buildSwopAccessNotice(
  error: AgentGroupError,
  fallbackAgentName = 'This agent'
): SwopAccessNotice {
  const needsMoreSwop =
    error.code === BALANCE_REQUIRED_CODE || Boolean(error.details?.buyMoreSwop);

  const agentName = swopAccessValue(error.details?.agentName, fallbackAgentName);
  const requiredSwop = swopAccessValue(error.details?.requiredSwop, '1000');
  const currentSwop = swopAccessValue(error.details?.currentSwop, '0');
  const deficitSwop = swopAccessValue(error.details?.deficitSwop, requiredSwop);
  const swopMint =
    error.details?.swopMint === undefined ||
    error.details?.swopMint === null ||
    error.details?.swopMint === ''
      ? null
      : String(error.details.swopMint);

  const message = needsMoreSwop
    ? `${agentName} is locked — needs ${requiredSwop} SWOP to use (you have ${currentSwop}). Buy ${deficitSwop} more SWOP to unlock it.`
    : error.message ||
      "We couldn't verify your SWOP balance. Try mentioning the agent again in a moment.";

  return {
    variant: needsMoreSwop ? 'locked' : 'check_failed',
    agentName,
    requiredSwop,
    currentSwop,
    deficitSwop,
    swopMint,
    message,
    canBuySwop: needsMoreSwop,
  };
}
