import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';

export const AGENT_ACTION_HANDOFF_STORAGE_KEY =
  'swop:agent-approved-action';
export const AGENT_ACTION_COMPLETION_STORAGE_KEY =
  'swop:agent-action-completions';

type UnknownRecord = Record<string, unknown>;

export interface AgentApprovalHandoffPayload {
  proposalId?: string;
  proposalNonce?: string;
  invocationId?: string;
  agentId?: string;
  groupId?: string;
  action?: string;
  toolType?: string;
  provider?: string;
  route?: string;
  panel?: string;
  requiredFields?: string[];
  normalizedParams?: UnknownRecord;
  strategy?: UnknownRecord | null;
  prefill?: {
    prompt?: string | null;
    strategyBrief?: string | null;
    targetProfitUsd?: string | number | null;
    targetProfitPct?: string | number | null;
    estimatedOrderUsd?: string | number | null;
    entryCondition?: string | null;
    exitCondition?: string | null;
    selectionCriteria?: string[] | null;
    executionPlan?: string[] | null;
    riskControls?: string[] | null;
    idleDeployment?: UnknownRecord | null;
    allocation?: UnknownRecord | null;
    fundingAsset?: string | null;
    maxOrderUsd?: string | number | null;
    maxDailySpendUsd?: string | number | null;
    maxDailyLossUsd?: string | number | null;
    maxOpenPositions?: string | number | null;
    cooldownSeconds?: string | number | null;
    expiry?: string | null;
    coin?: string | null;
    side?: string | null;
    size?: string | number | null;
    sizeUsd?: string | number | null;
    sizeCoins?: string | number | null;
    orderMode?: string | null;
    price?: string | number | null;
    takeProfitPrice?: string | number | null;
    stopLossPrice?: string | number | null;
    leverage?: string | number | null;
    isCross?: boolean | null;
    reduceOnly?: boolean | null;
    positionTpsl?: boolean | null;
    collateralUsd?: string | number | null;
    markPrice?: string | number | null;
    liquidationPrice?: string | number | null;
    marketId?: string | null;
    conditionId?: string | null;
    slug?: string | null;
    tokenId?: string | null;
    outcome?: string | null;
    amount?: string | number | null;
    amountType?: string | null;
    isUSD?: boolean | null;
    token?: string | null;
    tokenSymbol?: string | null;
    asset?: string | null;
    recipient?: string | null;
    recipientAddress?: string | null;
    recipientEns?: string | null;
    recipientName?: string | null;
    chain?: string | number | null;
    network?: string | number | null;
    fromToken?: string | null;
    toToken?: string | null;
    outputAmount?: string | number | null;
    fromChain?: string | number | null;
    toChain?: string | number | null;
    slippage?: string | number | null;
    orderType?: string | null;
    limitPrice?: string | number | null;
    name?: string | null;
    title?: string | null;
    description?: string | null;
    image?: string | null;
    imageUrl?: string | null;
    category?: string | null;
    nftType?: string | null;
    productType?: string | null;
    currency?: string | null;
    mintLimit?: string | number | null;
    quantity?: string | number | null;
    benefits?: string[] | null;
    requirements?: string[] | null;
    royaltyPercentage?: string | number | null;
  };
}

export interface AgentApprovalHandoff {
  status?: string;
  nextStep?: string;
  proposalNonce?: string;
  payload?: AgentApprovalHandoffPayload;
  approvedAt?: string;
  expiresAt?: string;
}

export type AgentActionCompletionStatus = 'executed' | 'failed';

export interface AgentActionCompletion {
  proposalId?: string;
  proposalNonce?: string;
  invocationId?: string;
  agentId?: string;
  groupId?: string;
  action?: string;
  toolType?: string;
  provider?: string;
  status: AgentActionCompletionStatus;
  title?: string;
  subtitle?: string;
  subject?: string;
  side?: string;
  stake?: string | number;
  toWin?: string | number;
  payout?: string | number;
  placedAt?: string;
  txHash?: string;
  txUrl?: string;
  orderId?: string | number;
  explorerLabel?: string;
  executionResult?: UnknownRecord;
  error?: UnknownRecord | string | null;
}

export type AgentActionReviewRequirement =
  | 'user_signature_required'
  | 'manual_review_required';

export interface AgentActionRiskBoundary {
  riskControls?: string[];
  maxOrderUsd?: string;
  maxDailySpendUsd?: string;
  maxDailyLossUsd?: string;
  maxOpenPositions?: string;
  cooldownSeconds?: number;
  expiry?: string;
  executionMode?: string;
  reviewRequirement?: AgentActionReviewRequirement;
}

export function persistAgentActionHandoff(handoff: AgentApprovalHandoff) {
  if (typeof window === 'undefined') return;

  const value = {
    approvalResult: handoff,
    payload: handoff.payload,
    receivedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(
    AGENT_ACTION_HANDOFF_STORAGE_KEY,
    JSON.stringify(value)
  );
  window.dispatchEvent(
    new CustomEvent('swop:agent-approved-action', {
      detail: value,
    })
  );
  queueAgentActionClientEvent({
    proposalId: handoff.payload?.proposalId,
    stage: 'handoff_persisted',
    action: handoff.payload?.action,
    toolType: handoff.payload?.toolType,
    provider: handoff.payload?.provider,
    groupId: handoff.payload?.groupId,
    invocationId: handoff.payload?.invocationId,
    agentId: handoff.payload?.agentId,
    route: handoff.payload?.route,
    panel: handoff.payload?.panel,
    uiSurface: 'agent_action_handoff',
  });
}

export function readAgentActionHandoff():
  | {
      approvalResult?: AgentApprovalHandoff;
      payload?: AgentApprovalHandoffPayload;
      receivedAt?: string;
    }
  | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(
    AGENT_ACTION_HANDOFF_STORAGE_KEY
  );
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.sessionStorage.removeItem(AGENT_ACTION_HANDOFF_STORAGE_KEY);
    return null;
  }
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return '';
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') || '';
}

function swopApiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(
    /\/$/,
    '',
  );
}

export function clearAgentActionHandoff() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(AGENT_ACTION_HANDOFF_STORAGE_KEY);
}

export function readAgentActionCompletions(): AgentActionCompletion[] {
  if (typeof window === 'undefined') return [];
  const raw = window.sessionStorage.getItem(
    AGENT_ACTION_COMPLETION_STORAGE_KEY,
  );
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.sessionStorage.removeItem(AGENT_ACTION_COMPLETION_STORAGE_KEY);
    return [];
  }
}

export function persistAgentActionCompletion(
  completion: AgentActionCompletion,
) {
  if (typeof window === 'undefined') return;

  const completions = readAgentActionCompletions();
  const next = [
    completion,
    ...completions.filter(
      (item) =>
        item.proposalId !== completion.proposalId ||
        item.status !== completion.status,
    ),
  ].slice(0, 20);

  window.sessionStorage.setItem(
    AGENT_ACTION_COMPLETION_STORAGE_KEY,
    JSON.stringify(next),
  );
  window.dispatchEvent(
    new CustomEvent('swop:agent-action-completed', {
      detail: completion,
    }),
  );
}

export async function reportAgentActionCompletion(
  completion: AgentActionCompletion,
  accessToken?: string | null,
) {
  if (!completion.proposalId) return null;
  const token = accessToken || decodeURIComponent(readCookie('access-token'));
  if (!token) return null;
  queueAgentActionClientEvent(
    {
      proposalId: completion.proposalId,
      stage: 'completion_report_started',
      action: completion.action,
      toolType: completion.toolType,
      provider: completion.provider,
      groupId: completion.groupId,
      invocationId: completion.invocationId,
      agentId: completion.agentId,
      uiSurface: 'agent_action_completion',
    },
    token,
  );

  let response: Response;
  try {
    response = await fetch(
      `${swopApiBase()}/api/v5/messages/agent-actions/${encodeURIComponent(
        completion.proposalId,
      )}/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: completion.status,
          executionResult: {
            proposalId: completion.proposalId,
            proposalNonce: completion.proposalNonce,
            invocationId: completion.invocationId,
            agentId: completion.agentId,
            groupId: completion.groupId,
            action: completion.action,
            toolType: completion.toolType,
            provider: completion.provider,
            title: completion.title,
            subtitle: completion.subtitle,
            subject: completion.subject,
            side: completion.side,
            stake: completion.stake,
            toWin: completion.toWin,
            payout: completion.payout,
            placedAt: completion.placedAt,
            txHash: completion.txHash,
            txUrl: completion.txUrl,
            orderId: completion.orderId,
            explorerLabel: completion.explorerLabel,
            ...(completion.executionResult || {}),
          },
          error: completion.error || null,
        }),
      },
    );
  } catch (error) {
    queueAgentActionClientEvent(
      {
        proposalId: completion.proposalId,
        stage: 'completion_report_failed',
        action: completion.action,
        toolType: completion.toolType,
        provider: completion.provider,
        groupId: completion.groupId,
        invocationId: completion.invocationId,
        agentId: completion.agentId,
        uiSurface: 'agent_action_completion',
        status: 'failed',
        error,
      },
      token,
    );
    throw error;
  }

  if (!response.ok) {
    queueAgentActionClientEvent(
      {
        proposalId: completion.proposalId,
        stage: 'completion_report_failed',
        action: completion.action,
        toolType: completion.toolType,
        provider: completion.provider,
        groupId: completion.groupId,
        invocationId: completion.invocationId,
        agentId: completion.agentId,
        uiSurface: 'agent_action_completion',
        status: 'failed',
        error: {
          message: `Complete endpoint returned ${response.status}`,
          status: response.status,
        },
      },
      token,
    );
    throw new Error(`Failed to report agent completion (${response.status})`);
  }

  const payload = await response.json();
  queueAgentActionClientEvent(
    {
      proposalId: completion.proposalId,
      stage: 'completion_report_succeeded',
      action: completion.action,
      toolType: completion.toolType,
      provider: completion.provider,
      groupId: completion.groupId,
      invocationId: completion.invocationId,
      agentId: completion.agentId,
      uiSurface: 'agent_action_completion',
    },
    token,
  );

  return payload;
}

export async function completeAgentActionFromHandoff(
  completion: Omit<
    AgentActionCompletion,
    | 'proposalId'
    | 'proposalNonce'
    | 'invocationId'
    | 'agentId'
    | 'groupId'
    | 'action'
    | 'toolType'
  > & {
    proposalId?: string;
  },
  accessToken?: string | null,
) {
  const handoff = readAgentActionHandoff();
  const payload = handoff?.payload;
  const proposalId = completion.proposalId || payload?.proposalId;

  if (!payload || !proposalId || payload.proposalId !== proposalId) {
    queueAgentActionClientEvent(
      {
        proposalId,
        stage: 'completion_skipped',
        provider: completion.provider,
        uiSurface: 'agent_action_completion',
        status: 'blocked',
        reason: !payload
          ? 'Missing approved action handoff'
          : 'Approved action handoff did not match proposal',
      },
      accessToken,
    );
    return null;
  }
  if (
    completion.provider &&
    payload.provider &&
    payload.provider !== completion.provider
  ) {
    queueAgentActionClientEvent(
      {
        proposalId,
        stage: 'completion_skipped',
        action: payload.action,
        toolType: payload.toolType,
        provider: completion.provider,
        groupId: payload.groupId,
        invocationId: payload.invocationId,
        agentId: payload.agentId,
        uiSurface: 'agent_action_completion',
        status: 'blocked',
        reason: 'Completion provider did not match approved handoff provider',
        context: {
          expectedProvider: payload.provider,
          completionProvider: completion.provider,
        },
      },
      accessToken,
    );
    return null;
  }

  const finalized: AgentActionCompletion = {
    proposalId,
    proposalNonce: payload.proposalNonce || handoff?.approvalResult?.proposalNonce,
    invocationId: String(payload.invocationId || ''),
    agentId: String(payload.agentId || 'astro'),
    groupId: String(payload.groupId || ''),
    action: payload.action,
    toolType: payload.toolType,
    provider: completion.provider || payload.provider,
    placedAt: completion.placedAt || new Date().toISOString(),
    ...completion,
  };

  persistAgentActionCompletion(finalized);
  await reportAgentActionCompletion(finalized, accessToken);
  clearAgentActionHandoff();

  return finalized;
}

export type HyperliquidOrderMode = 'market' | 'limit' | 'tpsl';

export interface HyperliquidAgentOrderPrefill extends AgentActionRiskBoundary {
  proposalId?: string;
  proposalNonce?: string;
  action?: string;
  coin?: string;
  side?: 'long' | 'short';
  sizeUsd?: string;
  sizeCoins?: string;
  orderMode?: HyperliquidOrderMode;
  price?: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  positionTpsl?: boolean;
  collateralUsd?: string;
  markPrice?: string;
  liquidationPrice?: string;
  leverage?: number;
  isCross?: boolean;
  reduceOnly?: boolean;
  requiredFields?: string[];
}

export interface PolymarketAgentOrderPrefill extends AgentActionRiskBoundary {
  proposalId?: string;
  proposalNonce?: string;
  action?: string;
  marketId?: string;
  conditionId?: string;
  slug?: string;
  marketRouteKey?: string;
  tokenId?: string;
  outcome?: 'yes' | 'no';
  side?: 'BUY' | 'SELL';
  amount?: string;
  orderType?: 'market' | 'limit';
  limitPrice?: string;
  requiredFields?: string[];
}

export interface MarketplaceAgentProductPrefill {
  proposalId?: string;
  proposalNonce?: string;
  action?: string;
  name?: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  mintLimit?: string;
  category?: 'physical' | 'digital';
  nftType?: string;
  benefits?: string[];
  requirements?: string[];
  royaltyPercentage?: string;
  requiredFields?: string[];
}

function payloadFrom(
  value?:
    | AgentApprovalHandoff
    | AgentApprovalHandoffPayload
    | { payload?: AgentApprovalHandoffPayload }
    | null
): AgentApprovalHandoffPayload | null {
  if (!value) return null;
  if ('payload' in value && value.payload) return value.payload;
  return value as AgentApprovalHandoffPayload;
}

function paramsFrom(payload: AgentApprovalHandoffPayload): UnknownRecord {
  return {
    ...(payload.normalizedParams || {}),
    ...(payload.prefill || {}),
  };
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function stringListValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const next = value
    .map((item) => stringValue(item))
    .filter((item): item is string => Boolean(item));
  return next.length ? next : undefined;
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function boolValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return undefined;
}

function firstString(params: UnknownRecord, names: string[]): string | undefined {
  for (const name of names) {
    const value = stringValue(params[name]);
    if (value) return value;
  }
  return undefined;
}

function firstStringList(
  params: UnknownRecord,
  names: string[],
): string[] | undefined {
  for (const name of names) {
    const value = stringListValue(params[name]);
    if (value?.length) return value;
  }
  return undefined;
}

function reviewRequirementFrom(
  value?:
    | AgentApprovalHandoff
    | AgentApprovalHandoffPayload
    | { payload?: AgentApprovalHandoffPayload }
    | null,
): AgentActionReviewRequirement | undefined {
  if (!value || !('nextStep' in value)) return undefined;
  const nextStep = stringValue(value.nextStep)?.toLowerCase();
  if (!nextStep) return undefined;
  if (
    nextStep.includes('signing_required') ||
    nextStep.includes('order_form_required')
  ) {
    return 'user_signature_required';
  }
  return 'manual_review_required';
}

function riskBoundaryFrom(
  params: UnknownRecord,
  value?:
    | AgentApprovalHandoff
    | AgentApprovalHandoffPayload
    | { payload?: AgentApprovalHandoffPayload }
    | null,
): AgentActionRiskBoundary {
  return {
    riskControls: firstStringList(params, ['riskControls'])?.slice(0, 4),
    maxOrderUsd: firstString(params, ['maxOrderUsd']),
    maxDailySpendUsd: firstString(params, ['maxDailySpendUsd']),
    maxDailyLossUsd: firstString(params, ['maxDailyLossUsd']),
    maxOpenPositions: firstString(params, ['maxOpenPositions']),
    cooldownSeconds: numberValue(params.cooldownSeconds),
    expiry: firstString(params, ['expiry']),
    executionMode: firstString(params, ['executionMode']),
    reviewRequirement: reviewRequirementFrom(value),
  };
}

const HYPERLIQUID_MARKET_ALIASES: Record<string, string[]> = {
  GOLD: ['PAXG', 'GOLD'],
  XAU: ['PAXG', 'GOLD'],
  XAUUSD: ['PAXG', 'GOLD'],
  PAXG: ['PAXG'],
  OIL: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  BRENT: ['BRENTOIL'],
  BRENTOIL: ['BRENTOIL'],
  'BRENT OIL': ['BRENTOIL'],
  CRUDE: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  'CRUDE OIL': ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  SPACEX: ['SPCX', 'SPACEX'],
  'SPACE X': ['SPCX', 'SPACEX'],
};

function normalizeHyperliquidMarketQuery(value: string) {
  return value
    .replace(/-?PERP\b/gi, ' ')
    .replace(/[$]/g, '')
    .replace(/[^a-zA-Z0-9: .&/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function compactHyperliquidMarketKey(value: string) {
  return normalizeHyperliquidMarketQuery(value).replace(/[^A-Z0-9]/g, '');
}

function displayHyperliquidCoin(value: string) {
  return value.includes(':') ? value.split(':').pop() || value : value;
}

function hyperliquidAliasTargets(value: string) {
  const normalized = normalizeHyperliquidMarketQuery(value);
  const compact = compactHyperliquidMarketKey(value);
  return [
    ...(HYPERLIQUID_MARKET_ALIASES[normalized] || []),
    ...(HYPERLIQUID_MARKET_ALIASES[compact] || []),
  ];
}

function hyperliquidCoinMatchesQuery(coin: string, query: string) {
  const coinKey = compactHyperliquidMarketKey(coin);
  const displayKey = compactHyperliquidMarketKey(displayHyperliquidCoin(coin));
  const queryKey = compactHyperliquidMarketKey(query);
  const aliasKeys = hyperliquidAliasTargets(query).map((target) =>
    compactHyperliquidMarketKey(target),
  );

  return [queryKey, ...aliasKeys].some(
    (target) => target && (target === coinKey || target === displayKey),
  );
}

function normalizeHyperliquidCoinFromParams(params: UnknownRecord) {
  const requested = firstString(params, [
    'marketQuery',
    'requestedMarket',
    'requestedMarketSymbol',
  ]);
  const direct = firstString(params, ['coin', 'symbol', 'asset']);

  if (direct && (!requested || hyperliquidCoinMatchesQuery(direct, requested))) {
    return direct.trim();
  }

  if (requested) {
    const alias = hyperliquidAliasTargets(requested)[0];
    return (alias || requested).trim();
  }

  return direct?.trim();
}

function normalizeHyperliquidSide(value: unknown): 'long' | 'short' | undefined {
  if (typeof value === 'boolean') return value ? 'long' : 'short';
  const normalized = stringValue(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (['long', 'buy', 'bid', 'bull', 'up'].includes(normalized)) return 'long';
  if (['short', 'sell', 'ask', 'bear', 'down'].includes(normalized)) return 'short';
  return undefined;
}

function normalizeHyperliquidOrderMode(value: unknown): HyperliquidOrderMode | undefined {
  const normalized = stringValue(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (['limit', 'post_only', 'post-only'].includes(normalized)) return 'limit';
  if (['tpsl', 'tp_sl', 'take_profit_stop_loss'].includes(normalized)) return 'tpsl';
  return 'market';
}

function normalizePolymarketOutcome(value: unknown): 'yes' | 'no' | undefined {
  if (value === 0 || value === '0') return 'yes';
  if (value === 1 || value === '1') return 'no';
  const normalized = stringValue(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (['yes', 'y', 'up', 'home', 'true'].includes(normalized)) return 'yes';
  if (['no', 'n', 'down', 'away', 'false'].includes(normalized)) return 'no';
  return undefined;
}

function normalizePolymarketSide(value: unknown): 'BUY' | 'SELL' | undefined {
  const normalized = stringValue(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (['buy', 'b', 'long'].includes(normalized)) return 'BUY';
  if (['sell', 's', 'short'].includes(normalized)) return 'SELL';
  return undefined;
}

function normalizePolymarketOrderType(value: unknown): 'market' | 'limit' | undefined {
  const normalized = stringValue(value)?.toLowerCase();
  if (!normalized) return undefined;
  if (['limit', 'gtd', 'gtc', 'post_only', 'post-only'].includes(normalized)) return 'limit';
  return 'market';
}

function toCentsInput(value: unknown): string | undefined {
  const number = numberValue(value);
  if (number === undefined || number <= 0) return undefined;
  const cents = number <= 1 ? number * 100 : number;
  return String(Math.round(cents));
}

export function getHyperliquidOrderPrefill(
  value?:
    | AgentApprovalHandoff
    | AgentApprovalHandoffPayload
    | { payload?: AgentApprovalHandoffPayload }
    | null
): HyperliquidAgentOrderPrefill | null {
  const payload = payloadFrom(value);
  if (!payload || payload.provider !== 'hyperliquid' || payload.panel !== 'perps') {
    return null;
  }

  const params = paramsFrom(payload);
  const coin = normalizeHyperliquidCoinFromParams(params);
  const side = normalizeHyperliquidSide(params.side ?? params.direction ?? params.isBuy);
  const orderMode = normalizeHyperliquidOrderMode(
    params.orderMode ?? params.orderType ?? params.type
  );
  const sizeUsd = firstString(params, [
    'sizeUsd',
    'usdSize',
    'notionalUsd',
    'amountUsd',
    'totalUsd',
    'amount',
    'usd',
    'notional',
    'valueUsd',
    'orderValueUsd',
  ]);
  const sizeCoins =
    firstString(params, [
      'positionSizeCoins',
      'sizeCoins',
      'coinSize',
      'sz',
      'totalSize',
    ]) ||
    (!sizeUsd ? firstString(params, ['size']) : undefined);
  const leverage = numberValue(params.leverage);

  return {
    ...riskBoundaryFrom(params, value),
    proposalId: payload.proposalId,
    proposalNonce: payload.proposalNonce,
    action: payload.action,
    coin,
    side,
    sizeUsd,
    sizeCoins,
    orderMode,
    price: firstString(params, ['price', 'limitPrice', 'p']),
    takeProfitPrice: firstString(params, [
      'takeProfitPrice',
      'takeProfit',
      'tpPrice',
      'tp',
    ]),
    stopLossPrice: firstString(params, [
      'stopLossPrice',
      'stopLoss',
      'slPrice',
      'sl',
    ]),
    positionTpsl: boolValue(params.positionTpsl),
    collateralUsd: firstString(params, ['collateralUsd', 'marginUsed']),
    markPrice: firstString(params, ['markPrice']),
    liquidationPrice: firstString(params, ['liquidationPrice']),
    leverage:
      leverage !== undefined && leverage > 0 ? Math.round(leverage) : undefined,
    isCross: boolValue(params.isCross ?? params.cross),
    reduceOnly: boolValue(params.reduceOnly),
    requiredFields: payload.requiredFields,
  };
}

export function getPolymarketOrderPrefill(
  value?:
    | AgentApprovalHandoff
    | AgentApprovalHandoffPayload
    | { payload?: AgentApprovalHandoffPayload }
    | null
): PolymarketAgentOrderPrefill | null {
  const payload = payloadFrom(value);
  if (!payload || payload.provider !== 'polymarket') return null;

  const params = paramsFrom(payload);
  const marketId = firstString(params, ['marketId', 'market_id', 'id']);
  const conditionId = firstString(params, ['conditionId', 'condition_id']);
  const slug = firstString(params, ['slug', 'marketSlug']);
  const marketRouteKey = conditionId || marketId || slug;
  const orderType = normalizePolymarketOrderType(
    params.orderType ?? params.type ?? params.timeInForce
  );

  return {
    ...riskBoundaryFrom(params, value),
    proposalId: payload.proposalId,
    proposalNonce: payload.proposalNonce,
    action: payload.action,
    marketId,
    conditionId,
    slug,
    marketRouteKey,
    tokenId: firstString(params, ['tokenId', 'token_id', 'asset']),
    outcome: normalizePolymarketOutcome(params.outcome ?? params.outcomeIndex),
    side: normalizePolymarketSide(params.side ?? params.direction),
    amount: firstString(params, [
      'amount',
      'amountUsd',
      'usdcAmount',
      'cost',
      'size',
      'shares',
    ]),
    orderType,
    limitPrice:
      orderType === 'limit'
        ? toCentsInput(params.price ?? params.limitPrice)
        : undefined,
    requiredFields: payload.requiredFields,
  };
}

export function getMarketplaceProductPrefill(
  value?:
    | AgentApprovalHandoff
    | AgentApprovalHandoffPayload
    | { payload?: AgentApprovalHandoffPayload }
    | null
): MarketplaceAgentProductPrefill | null {
  const payload = payloadFrom(value);
  if (!payload || payload.provider !== 'marketplace') return null;

  const params = paramsFrom(payload);
  const nftType = firstString(params, ['nftType', 'productType']);
  const category = firstString(params, ['category']);
  const normalizedCategory =
    category === 'physical' || nftType === 'phygital' || nftType === 'menu'
      ? 'physical'
      : category === 'digital' || nftType
        ? 'digital'
        : undefined;

  return {
    proposalId: payload.proposalId,
    proposalNonce: payload.proposalNonce,
    action: payload.action,
    name: firstString(params, ['name', 'title']),
    description: firstString(params, ['description']),
    image: firstString(params, ['image', 'imageUrl']),
    price: firstString(params, ['price']),
    currency: firstString(params, ['currency']) || 'usdc',
    mintLimit: firstString(params, ['mintLimit', 'quantity']),
    category: normalizedCategory,
    nftType,
    benefits: Array.isArray(params.benefits)
      ? params.benefits.map(String)
      : undefined,
    requirements: Array.isArray(params.requirements)
      ? params.requirements.map(String)
      : undefined,
    royaltyPercentage: firstString(params, ['royaltyPercentage']),
    requiredFields: payload.requiredFields,
  };
}
