import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';

const REPORTED_FLAG = '__swopWalletSwapFailureReported';

export const WALLET_SWAP_FAILURE_PROPOSAL_PREFIX = 'local-swap-wallet-';

export type WalletSwapFailureTelemetryPayload = Record<string, unknown>;

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function compactContext(payload: WalletSwapFailureTelemetryPayload) {
  const keys = [
    'stage',
    'network',
    'walletAddress',
    'inputToken',
    'outputToken',
    'route',
    'balanceContext',
    'simulationLogs',
    'transactionHash',
    'isCopyTrade',
    'copyTradePostId',
  ];

  return keys.reduce<Record<string, unknown>>((context, key) => {
    if (payload[key] !== undefined) {
      context[key] = payload[key];
    }
    return context;
  }, {});
}

export function buildWalletSwapFailureProposalId(now = Date.now()) {
  const suffix = Math.random().toString(36).slice(2, 8) || 'event';
  return `${WALLET_SWAP_FAILURE_PROPOSAL_PREFIX}${now}-${suffix}`;
}

export function queueWalletSwapFailureClientEvent(
  payload: WalletSwapFailureTelemetryPayload,
  accessToken?: string | null,
) {
  const proposalId =
    optionalString(payload.proposalId) || buildWalletSwapFailureProposalId();
  const provider = optionalString(payload.provider) || 'swop';
  const reason =
    optionalString(payload.reason) ||
    optionalString(payload.stage) ||
    'Wallet swap failed';

  queueAgentActionClientEvent(
    {
      proposalId,
      stage: 'execution_failed',
      action: optionalString(payload.action) || 'wallet.swap',
      toolType: optionalString(payload.toolType) || 'wallet.write',
      provider,
      uiSurface: optionalString(payload.uiSurface) || 'wallet_swap_modal',
      status: 'failed',
      reason,
      error: payload.error ?? payload.simulationError ?? reason,
      context: compactContext(payload),
      metadata: {
        capturedBy: 'wallet_swap_failure_telemetry',
      },
    },
    accessToken || undefined,
  );

  return proposalId;
}

export function markWalletSwapFailureReported(error: unknown) {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
    return;
  }

  try {
    Object.defineProperty(error, REPORTED_FLAG, {
      configurable: true,
      value: true,
    });
  } catch {
    try {
      (error as Record<string, unknown>)[REPORTED_FLAG] = true;
    } catch {
      // Some provider errors are not extensible. The report was still sent.
    }
  }
}

export function wasWalletSwapFailureReported(error: unknown) {
  return Boolean(
    error &&
      (typeof error === 'object' || typeof error === 'function') &&
      (error as Record<string, unknown>)[REPORTED_FLAG],
  );
}
