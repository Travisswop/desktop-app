'use client';

// Polymarket prediction-market display cards for the Astro chat: market list,
// grouped game cards, the inline bet slip (PolymarketMarketCard), PnL and
// positions snapshots, and the mini probability chart, plus their card-only
// helpers. Extracted from ChatArea.tsx.

import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import { Ban, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { apiFetch } from '@/lib/api/apiFetch';
import { AgentActionReceiptCard } from '@/components/chat/tickets/AgentActionReceiptCard';
import {
  AgentApprovalHandoff,
  completeAgentActionFromHandoff,
  persistAgentActionHandoff,
  type AgentActionCompletion,
} from '@/lib/chat/agentActionHandoff';
import {
  AgentActionProposal,
  AgentActionResultPayload,
} from '@/hooks/useGroupAgents';
import { postFeed } from '@/actions/postFeed';
import { resolvePredictionFeedExecution } from '@/lib/polymarket/orderExecution';
import { useTrading } from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import { POLYMARKET_BACKEND_PROXY_URL } from '@/constants/polymarket';
import { type PolymarketPosition } from '@/hooks/polymarket/useUserPositions';
import {
  useClobOrder,
  type OrderSubmissionStage,
} from '@/hooks/polymarket/useClobOrder';
import {
  buildPolymarketBetKey,
  clampProbability,
  formatCompactUsd,
  formatPolymarketMarketLabel,
  formatPolymarketPrice,
  formatSignedUsd,
  getAgentFeedIdentity,
  getPolymarketOutcomeLabels,
  getPolymarketTokenId,
  hasRenderedReceiptIdentity,
  isOpenPredictionConsolePosition,
  isProposalNoLongerPendingError,
  normalizePredictionConsolePositions,
  normalizeIntentText,
  parseLivePolymarketPrice,
  parsePolymarketProbability,
  toAgentFeedNumber,
  toFiniteNumber,
  triggerAgentFeedRefresh,
  type PolymarketMarketDisplayLabel,
} from '@/lib/chat/ticketFormat';
import { AGENT_PANEL_CLASS } from '@/lib/chat/ticketStyles';
import type {
  AstroConsoleData,
  HistoryPoint,
  InlinePolymarketQuoteState,
  PnlOverviewPreview,
  PolymarketLiveQuote,
  PolymarketMarketGroup,
  PolymarketMarketPreview,
  PolymarketOrderPrefill,
  User,
} from '@/lib/chat/agentCardTypes';

function formatPredictionShares(value: unknown) {
  const number = toFiniteNumber(value);
  if (number <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: number >= 100 ? 0 : number >= 10 ? 1 : 2,
  }).format(number);
}

function formatPredictionAmountInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '1';
  return value.toLocaleString('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
    useGrouping: false,
  });
}

function getInlineOrderStageButtonLabel(stage: OrderSubmissionStage) {
  switch (stage) {
    case 'preparing':
      return 'PREPARING ORDER...';
    case 'signing':
      return 'SIGNING ORDER...';
    case 'submitting':
      return 'SUBMITTING ORDER...';
    default:
      return 'CONFIRMING...';
  }
}

function getInlineOrderStageHint(stage: OrderSubmissionStage) {
  switch (stage) {
    case 'preparing':
      return 'Swop is building the order before signature.';
    case 'signing':
      return 'Signing the confirmed ticket from this card.';
    case 'submitting':
      return 'Your signed order is being sent to Polymarket.';
    default:
      return 'Confirming the order.';
  }
}

const EMPTY_INLINE_POLYMARKET_QUOTE: InlinePolymarketQuoteState = {
  tokenId: '',
  status: 'idle',
  bid: null,
  ask: null,
};

const DEFAULT_MARKET_GROUP_DISPLAY_LIMIT = 4;
const SPORTS_GAME_GROUP_DISPLAY_LIMIT = 6;
const SPORTS_GAME_MARKET_PREVIEW_LIMIT = 3;

export function PolymarketMarketCards({
  markets,
  onPrepareBet,
  pendingBetKey,
  inlineProposalsByBetKey,
  actionResultsByProposalId,
  pendingProposalId,
  orderPrefill,
  canAct,
  onApproveInlineProposal,
  onInlineActionComplete,
  onRejectProposal,
  onAddPredictionFunds,
  astroConsoleData,
  renderedReceiptIdentityKeys,
}: {
  markets: PolymarketMarketPreview[];
  onPrepareBet: (
    prompt: string,
    betKey: string
  ) => Promise<AgentActionProposal | null>;
  pendingBetKey?: string | null;
  inlineProposalsByBetKey: Record<string, AgentActionProposal>;
  actionResultsByProposalId: Record<string, AgentActionResultPayload>;
  pendingProposalId?: string | null;
  orderPrefill?: PolymarketOrderPrefill | null;
  canAct: boolean;
  onApproveInlineProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onRejectProposal: (proposalId: string) => void;
  onAddPredictionFunds: () => void;
  astroConsoleData: AstroConsoleData;
  renderedReceiptIdentityKeys: Set<string>;
}) {
  if (!markets.length) return null;

  const marketGroups = groupPolymarketMarkets(markets);
  const isSportsGameList =
    marketGroups.filter(isSportsMarketGroup).length >= 2;
  const groupDisplayLimit = isSportsGameList
    ? SPORTS_GAME_GROUP_DISPLAY_LIMIT
    : DEFAULT_MARKET_GROUP_DISPLAY_LIMIT;
  const eventMarketPreviewLimit = isSportsGameList
    ? SPORTS_GAME_MARKET_PREVIEW_LIMIT
    : undefined;

  return (
    <div className="mt-2 grid gap-3">
      {marketGroups.slice(0, groupDisplayLimit).map((group, index) =>
        group.isEventGroup && group.markets.length > 1 ? (
          <PolymarketGameMarketCard
            key={group.key}
            group={group}
            marketPreviewLimit={eventMarketPreviewLimit}
            onPrepareBet={onPrepareBet}
            pendingBetKey={pendingBetKey}
            inlineProposalsByBetKey={inlineProposalsByBetKey}
            actionResultsByProposalId={actionResultsByProposalId}
            pendingProposalId={pendingProposalId}
            orderPrefill={orderPrefill}
            canAct={canAct}
            onApproveInlineProposal={onApproveInlineProposal}
            onInlineActionComplete={onInlineActionComplete}
            onRejectProposal={onRejectProposal}
            onAddPredictionFunds={onAddPredictionFunds}
            astroConsoleData={astroConsoleData}
            renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
          />
        ) : (
          <PolymarketMarketCard
            key={
              group.markets[0]?.conditionId ||
              group.markets[0]?.id ||
              group.markets[0]?.slug ||
              group.key
            }
            market={group.markets[0]}
            onPrepareBet={onPrepareBet}
            pendingBetKey={pendingBetKey}
            inlineProposalsByBetKey={inlineProposalsByBetKey}
            actionResultsByProposalId={actionResultsByProposalId}
            pendingProposalId={pendingProposalId}
            orderPrefill={orderPrefill}
            canAct={canAct}
            onApproveInlineProposal={onApproveInlineProposal}
            onInlineActionComplete={onInlineActionComplete}
            onRejectProposal={onRejectProposal}
            onAddPredictionFunds={onAddPredictionFunds}
            astroConsoleData={astroConsoleData}
            renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
            preferLiveChart={index === 0}
          />
        )
      )}
    </div>
  );
}

export function AgentMarketBlock({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="my-3 w-full min-w-0 max-w-full border-l-2 border-[#3fe08f] pl-3">
      <div className="dm-mono mb-2 flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
        <span className="min-w-0 truncate">{label}</span>
        {meta ? (
          <span className="shrink-0 tracking-[0.05em] text-[#5a5e69]">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function PnlOverviewCard({ overview }: { overview: PnlOverviewPreview }) {
  const totalTradingPnl =
    overview.perpsUnrealizedPnl + overview.predictionUnrealizedPnl;
  const checkedAt = new Date(overview.checkedAt);
  const checkedAtLabel = Number.isNaN(checkedAt.getTime())
    ? ''
    : checkedAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
  const rows = [
    {
      label: 'wallet',
      value: formatCompactUsd(overview.walletPortfolioValue),
      detail: 'portfolio value',
      delta: '',
      deltaValue: null,
    },
    {
      label: 'perps',
      value: formatCompactUsd(overview.perpsAccountValue),
      detail: `${overview.perpsPositionCount} open position${
        overview.perpsPositionCount === 1 ? '' : 's'
      }`,
      delta: formatSignedUsd(overview.perpsUnrealizedPnl),
      deltaValue: overview.perpsUnrealizedPnl,
    },
    {
      label: 'predictions',
      value: formatCompactUsd(overview.predictionPortfolioValue),
      detail: `${overview.predictionPositionCount} open market${
        overview.predictionPositionCount === 1 ? '' : 's'
      }`,
      delta: formatSignedUsd(overview.predictionUnrealizedPnl),
      deltaValue: overview.predictionUnrealizedPnl,
    },
    {
      label: 'orders',
      value: String(overview.pendingOrderCount),
      detail: 'pending',
      delta: '',
      deltaValue: null,
    },
  ];

  return (
    <div className={`${AGENT_PANEL_CLASS} mt-2 w-full overflow-hidden text-xs`}>
      <div className="border-b border-white/[0.07] px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
              pnl snapshot
            </div>
            <div
              className={`dm-mono mt-1 text-[24px] font-black leading-tight ${
                totalTradingPnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff5d63]'
              }`}
            >
              {formatSignedUsd(totalTradingPnl)}
            </div>
          </div>
          <div className="dm-mono shrink-0 text-right text-[10px] font-semibold text-[#5a5e69]">
            {checkedAtLabel ? `checked ${checkedAtLabel}` : 'live snapshot'}
          </div>
        </div>
        {overview.isLoading && (
          <div className="mt-2 rounded-[8px] border border-[#e8920f]/25 bg-[#e8920f]/10 px-2.5 py-2 text-[10.5px] font-semibold text-[#ffd08a]">
            Refreshing balances. Values may update in a moment.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/[0.045]">
        {rows.map((row) => {
          const deltaTone =
            row.deltaValue === null || row.deltaValue === 0
              ? 'text-[#5a5e69]'
              : row.deltaValue < 0
              ? 'text-[#ff5d63]'
              : 'text-[#3fe08f]';

          return (
            <div key={row.label} className="bg-[#15171d] px-3.5 py-3">
              <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                {row.label}
              </div>
              <div className="dm-mono mt-1 text-[14px] font-bold text-[#eceef2]">
                {row.value}
              </div>
              <div className="dm-mono mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-[#737783]">
                <span className="min-w-0 truncate">{row.detail}</span>
                {row.delta && (
                  <span className={`shrink-0 ${deltaTone}`}>
                    {row.delta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PolymarketPositionsCard({
  positions,
}: {
  positions: PolymarketPosition[];
}) {
  const consolePositions = normalizePredictionConsolePositions(positions);
  const openPositions = consolePositions.filter(isOpenPredictionConsolePosition);
  const displayPositions = (
    openPositions.length ? openPositions : consolePositions
  ).slice(0, 4);
  const totalValue = displayPositions.reduce(
    (sum, position) => sum + toFiniteNumber(position.currentValue),
    0
  );
  const totalPnl = displayPositions.reduce(
    (sum, position) => sum + toFiniteNumber(position.cashPnl),
    0
  );
  const hasMore = consolePositions.length > displayPositions.length;

  return (
    <div className={`${AGENT_PANEL_CLASS} mt-2 w-full overflow-hidden text-xs`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-3.5 py-3">
        <div className="min-w-0">
          <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
            polymarket positions
          </div>
          <div className="mt-1 text-[15px] font-bold text-[#eceef2]">
            {openPositions.length || consolePositions.length} position
            {(openPositions.length || consolePositions.length) === 1 ? '' : 's'}
          </div>
        </div>
        <div className="dm-mono shrink-0 text-right text-[10px] font-semibold">
          <div className="text-[#eceef2]">{formatCompactUsd(totalValue)}</div>
          <div className={totalPnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff5d63]'}>
            {formatSignedUsd(totalPnl)}
          </div>
        </div>
      </div>

      <div className="grid gap-0">
        {displayPositions.map((position) => {
          const pnl = toFiniteNumber(position.cashPnl);
          const percentPnl = toFiniteNumber(position.percentPnl);
          const pnlLabel =
            percentPnl === 0
              ? formatSignedUsd(pnl)
              : `${formatSignedUsd(pnl)} · ${
                  percentPnl > 0 ? '+' : ''
                }${percentPnl.toFixed(2)}%`;
          return (
            <div
              key={`${position.conditionId}-${position.asset}`}
              className="border-t border-white/[0.045] first:border-t-0"
            >
              <div className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#eceef2]">
                    {position.title || 'Prediction market'}
                  </span>
                  <span className="dm-mono mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#737783]">
                    <span className="rounded-[5px] border border-[#3fe08f]/15 bg-black/25 px-1.5 py-0.5 text-[#3fe08f]">
                      {position.outcome || 'Outcome'}
                    </span>
                    <span>{formatPredictionShares(position.size)} shares</span>
                    <span>{formatPolymarketPrice(position.curPrice)}</span>
                  </span>
                </span>
                <span
                  className={`dm-mono shrink-0 text-right text-[11px] font-bold ${
                    pnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff5d63]'
                  }`}
                >
                  {pnlLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="border-t border-white/[0.045] px-3.5 py-2 text-[11px] font-semibold text-[#737783]">
          {consolePositions.length - displayPositions.length} more position
          {consolePositions.length - displayPositions.length === 1 ? '' : 's'} available.
        </div>
      )}
    </div>
  );
}

function PolymarketGameMarketCard({
  group,
  marketPreviewLimit,
  onPrepareBet,
  pendingBetKey,
  inlineProposalsByBetKey,
  actionResultsByProposalId,
  pendingProposalId,
  orderPrefill,
  canAct,
  onApproveInlineProposal,
  onInlineActionComplete,
  onRejectProposal,
  onAddPredictionFunds,
  astroConsoleData,
  renderedReceiptIdentityKeys,
}: {
  group: PolymarketMarketGroup;
  marketPreviewLimit?: number;
  onPrepareBet: (
    prompt: string,
    betKey: string
  ) => Promise<AgentActionProposal | null>;
  pendingBetKey?: string | null;
  inlineProposalsByBetKey: Record<string, AgentActionProposal>;
  actionResultsByProposalId: Record<string, AgentActionResultPayload>;
  pendingProposalId?: string | null;
  orderPrefill?: PolymarketOrderPrefill | null;
  canAct: boolean;
  onApproveInlineProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onRejectProposal: (proposalId: string) => void;
  onAddPredictionFunds: () => void;
  astroConsoleData: AstroConsoleData;
  renderedReceiptIdentityKeys: Set<string>;
}) {
  const primaryMarket = group.markets[0];
  const title =
    normalizePolymarketEventTitle(primaryMarket.eventTitle) ||
    humanizePolymarketEventSlug(
      normalizePolymarketEventSlug(primaryMarket.eventSlug)
    ) ||
    primaryMarket.question ||
    'Prediction markets';
  const timing = formatPolymarketMarketTiming(primaryMarket);
  const league = inferPolymarketLeague(primaryMarket);
  const liveLabel = primaryMarket.eventLive
    ? `Live${timing && timing !== 'Live' ? ` · ${timing}` : ''}`
    : timing;
  const visibleMarkets =
    marketPreviewLimit && marketPreviewLimit > 0
      ? group.markets.slice(0, marketPreviewLimit)
      : group.markets;
  const hiddenMarketCount = Math.max(
    group.markets.length - visibleMarkets.length,
    0
  );

  return (
    <AgentMarketBlock
      label={`market · ${league}`}
      meta={new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}
    >
      <div
        className={`${AGENT_PANEL_CLASS} w-full min-w-0 max-w-[460px] overflow-hidden text-xs`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="dm-mono inline-flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff5d63]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d63]" />
            <span className="min-w-0 truncate">{liveLabel || 'market'}</span>
          </div>
          <span className="dm-mono text-[10px] uppercase tracking-[0.08em] text-[#5a5e69]">
            {league}
          </span>
        </div>

        <div className="px-4 py-3.5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 break-words text-[14px] font-semibold leading-snug text-[#eceef2] [overflow-wrap:anywhere]">
              {title}
            </div>
            <div className="dm-mono shrink-0 text-right text-[10px] text-[#5a5e69]">
              {group.markets.length} markets
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3">
            {visibleMarkets.map((market, index) => (
              <PolymarketMarketCard
                key={market.conditionId || market.id || market.slug || index}
                market={market}
                onPrepareBet={onPrepareBet}
                pendingBetKey={pendingBetKey}
                inlineProposalsByBetKey={inlineProposalsByBetKey}
                actionResultsByProposalId={actionResultsByProposalId}
                pendingProposalId={pendingProposalId}
                orderPrefill={orderPrefill}
                canAct={canAct}
                onApproveInlineProposal={onApproveInlineProposal}
                onInlineActionComplete={onInlineActionComplete}
                onRejectProposal={onRejectProposal}
                onAddPredictionFunds={onAddPredictionFunds}
                astroConsoleData={astroConsoleData}
                renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                preferLiveChart={false}
                embeddedInGroup
                groupTitle={title}
              />
            ))}
            {hiddenMarketCount > 0 && (
              <div className="dm-mono rounded-md border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#737783]">
                +{hiddenMarketCount} more markets for this game
              </div>
            )}
          </div>
        </div>

        <div className="dm-mono flex items-center justify-between gap-3 border-t border-dashed border-white/[0.07] px-4 py-3 text-[10px]">
          <span className="truncate text-[#5a5e69]">
            self-custodied · swop book
          </span>
          <span className="shrink-0 text-[#9396a0]">tap an odd to bet →</span>
        </div>
      </div>
    </AgentMarketBlock>
  );
}

function PolymarketMarketCard({
  market,
  onPrepareBet,
  pendingBetKey,
  inlineProposalsByBetKey,
  actionResultsByProposalId,
  pendingProposalId,
  orderPrefill,
  canAct,
  onApproveInlineProposal,
  onInlineActionComplete,
  onRejectProposal,
  onAddPredictionFunds,
  astroConsoleData,
  renderedReceiptIdentityKeys,
  preferLiveChart,
  embeddedInGroup = false,
  groupTitle,
}: {
  market: PolymarketMarketPreview;
  onPrepareBet: (
    prompt: string,
    betKey: string
  ) => Promise<AgentActionProposal | null>;
  pendingBetKey?: string | null;
  inlineProposalsByBetKey: Record<string, AgentActionProposal>;
  actionResultsByProposalId: Record<string, AgentActionResultPayload>;
  pendingProposalId?: string | null;
  orderPrefill?: PolymarketOrderPrefill | null;
  canAct: boolean;
  onApproveInlineProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onRejectProposal: (proposalId: string) => void;
  onAddPredictionFunds: () => void;
  astroConsoleData: AstroConsoleData;
  renderedReceiptIdentityKeys: Set<string>;
  preferLiveChart: boolean;
  embeddedInGroup?: boolean;
  groupTitle?: string;
}) {
  const question = market.question || 'Polymarket market';
  const displayQuestion = formatPolymarketMarketLabel(market, groupTitle);
  const outcomes = getPolymarketOutcomeLabels(market);
  const yesPrice = formatPolymarketPrice(market.yesPrice);
  const noPrice = formatPolymarketPrice(market.noPrice);
  const timing = formatPolymarketMarketTiming(market);
  const yesKey = buildPolymarketBetKey(market, 'yes');
  const noKey = buildPolymarketBetKey(market, 'no');
  const matchingOrderPrefill = orderPrefillMatchesMarket(
    orderPrefill,
    market,
    yesKey,
    noKey
  )
    ? orderPrefill
    : null;
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no' | null>(
    matchingOrderPrefill?.outcome || null
  );
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>(
    matchingOrderPrefill?.orderType || 'market'
  );
  const [stake, setStake] = useState(matchingOrderPrefill?.amount || '1');
  const [limitPrice, setLimitPrice] = useState(
    matchingOrderPrefill?.limitPriceCents || ''
  );
  const [localReceipt, setLocalReceipt] =
    useState<AgentActionCompletion | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [liveQuote, setLiveQuote] =
    useState<InlinePolymarketQuoteState>(EMPTY_INLINE_POLYMARKET_QUOTE);
  const confirmInFlightRef = useRef(false);
  const quoteRequestRef = useRef(0);
  const trading = useTrading();
  const { accessToken, user } = useUser();
  const {
    submitOrder,
    isSubmitting: isSubmittingOrder,
    orderStage,
  } = useClobOrder(trading.tradingSession, trading.tradingWalletAddress);

  useEffect(() => {
    if (!matchingOrderPrefill) return;
    setSelectedOutcome(matchingOrderPrefill.outcome);
    setOrderMode(matchingOrderPrefill.orderType || 'market');
    setStake(matchingOrderPrefill.amount || '1');
    setLimitPrice(matchingOrderPrefill.limitPriceCents || '');
  }, [
    matchingOrderPrefill,
    matchingOrderPrefill?.amount,
    matchingOrderPrefill?.limitPriceCents,
    matchingOrderPrefill?.marketKey,
    matchingOrderPrefill?.orderType,
    matchingOrderPrefill?.outcome,
  ]);

  const selectedKey =
    selectedOutcome === 'yes'
      ? yesKey
      : selectedOutcome === 'no'
      ? noKey
      : '';
  const selectedPrice =
    selectedOutcome === 'yes'
      ? market.yesPrice
      : selectedOutcome === 'no'
      ? market.noPrice
      : undefined;
  const selectedSummaryPriceLabel =
    selectedOutcome === 'yes'
      ? yesPrice
      : selectedOutcome === 'no'
      ? noPrice
      : '';
  const selectedLabel =
    selectedOutcome === 'yes' ? outcomes.yes : outcomes.no;
  const selectedAccent =
    selectedOutcome === 'no' ? '#ff5d63' : '#3fe08f';
  const selectedTokenId = selectedOutcome
    ? getPolymarketTokenId(market, selectedOutcome)
    : '';
  const embeddedQuote = selectedOutcome
    ? getPolymarketRealtimeQuote(market, selectedOutcome)
    : null;
  const embeddedQuoteBid = embeddedQuote?.bid ?? null;
  const embeddedQuoteAsk = embeddedQuote?.ask ?? null;

  const refreshSelectedMarketQuote = useCallback(async () => {
    if (!selectedTokenId || !selectedOutcome) {
      setLiveQuote(EMPTY_INLINE_POLYMARKET_QUOTE);
      return null;
    }

    const requestId = quoteRequestRef.current + 1;
    quoteRequestRef.current = requestId;
    const fallbackQuote = {
      bid: embeddedQuoteBid,
      ask: embeddedQuoteAsk,
    };

    setLiveQuote({
      tokenId: selectedTokenId,
      status: 'loading',
      bid: fallbackQuote.bid,
      ask: fallbackQuote.ask,
    });

    try {
      const quote = await fetchPolymarketLiveQuote(selectedTokenId);
      if (quoteRequestRef.current === requestId) {
        setLiveQuote({
          tokenId: selectedTokenId,
          status: quote.ask != null ? 'ready' : 'unavailable',
          bid: quote.bid,
          ask: quote.ask,
          message:
            quote.ask != null
              ? undefined
              : 'No live ask is available for this market right now.',
        });
      }
      return quote;
    } catch (error) {
      if (quoteRequestRef.current === requestId) {
        setLiveQuote({
          tokenId: selectedTokenId,
          status: fallbackQuote.ask != null ? 'ready' : 'error',
          bid: fallbackQuote.bid,
          ask: fallbackQuote.ask,
          message:
            fallbackQuote.ask != null
              ? undefined
              : error instanceof Error
              ? error.message
              : 'Could not refresh the live market price.',
        });
      }

      return fallbackQuote.ask != null ? fallbackQuote : null;
    }
  }, [embeddedQuoteAsk, embeddedQuoteBid, selectedOutcome, selectedTokenId]);

  useEffect(() => {
    if (!selectedOutcome || !selectedTokenId || orderMode !== 'market') {
      setLiveQuote(EMPTY_INLINE_POLYMARKET_QUOTE);
      return;
    }

    void refreshSelectedMarketQuote();
  }, [
    orderMode,
    refreshSelectedMarketQuote,
    selectedOutcome,
    selectedTokenId,
  ]);

  const stakeValue = Number(stake || 0);
  const selectedProbability = parsePolymarketProbability(selectedPrice, 0.5);
  const isLimitOrder = orderMode === 'limit';
  const limitPriceDecimal = Number(limitPrice || 0) / 100;
  const selectedLiveQuote =
    liveQuote.tokenId === selectedTokenId ? liveQuote : null;
  const liveAskPrice = selectedLiveQuote?.ask ?? embeddedQuoteAsk;
  const isCheckingLiveAsk = Boolean(
    selectedOutcome &&
      !isLimitOrder &&
      selectedTokenId &&
      selectedLiveQuote?.status === 'loading'
  );
  const hasNoLiveAsk = Boolean(
    selectedOutcome &&
      !isLimitOrder &&
      selectedTokenId &&
      selectedLiveQuote?.status === 'unavailable' &&
      liveAskPrice == null
  );
  const hasLiveQuoteError = Boolean(
    selectedOutcome &&
      !isLimitOrder &&
      selectedTokenId &&
      selectedLiveQuote?.status === 'error' &&
      liveAskPrice == null
  );
  const marketQuoteBlocksConfirm =
    isCheckingLiveAsk || hasNoLiveAsk || hasLiveQuoteError;
  const effectiveProbability =
    isLimitOrder && limitPriceDecimal > 0
      ? limitPriceDecimal
      : liveAskPrice ?? selectedProbability;
  const selectedPriceLabel =
    isLimitOrder
      ? selectedSummaryPriceLabel
      : formatPolymarketPrice(liveAskPrice) || selectedSummaryPriceLabel;
  const orderShares =
    !hasNoLiveAsk && !hasLiveQuoteError && effectiveProbability > 0 && stakeValue > 0
      ? stakeValue / effectiveProbability
      : 0;
  const orderCost =
    stakeValue > 0 ? stakeValue : 0;
  const payoutTotal = Math.max(0, orderShares);
  const payout = {
    profit: Math.max(0, payoutTotal - Math.max(0, orderCost)),
    total: payoutTotal,
  };
  const isSelectedPending = Boolean(
    selectedOutcome && pendingBetKey === selectedKey
  );
  const isPreparing = Boolean(pendingBetKey);
  const isBusy = isPreparing || isConfirming || isSubmittingOrder;
  const activeOrderStage = orderStage !== 'idle';
  const inlineProposal = selectedOutcome
    ? inlineProposalsByBetKey[selectedKey]
    : null;
  const inlineActionResult = inlineProposal?.proposalId
    ? actionResultsByProposalId[inlineProposal.proposalId]
    : undefined;
  const existingApprovalResult =
    inlineActionResult?.result || inlineProposal?.approvalResult || null;
  const inlineStatus =
    inlineActionResult?.status || inlineProposal?.status || null;
  const canUseInlineProposal = Boolean(
    inlineProposal?.proposalId &&
      (inlineStatus === 'pending' ||
        (inlineStatus === 'approved' &&
          existingApprovalResult?.payload?.proposalId ===
            inlineProposal.proposalId))
  );
  const isInlineProposalPending =
    inlineProposal?.proposalId === pendingProposalId;
  const approvalParams =
    selectedOutcome
      ? {
          marketId: market.id || undefined,
          conditionId: market.conditionId || undefined,
          slug: market.slug || undefined,
          tokenId: selectedTokenId || undefined,
          outcome: selectedOutcome,
          outcomeLabel: selectedLabel,
          side: 'BUY',
          amount: isLimitOrder
            ? formatPredictionAmountInput(orderShares)
            : stake,
          orderType: orderMode,
          price: isLimitOrder ? limitPriceDecimal : undefined,
        }
      : undefined;
  const availableUsdc = astroConsoleData.predictionUsdcBalance;
  const amountDialMax = Math.max(
    25,
    Math.ceil(Math.max(availableUsdc || 0, stakeValue || 0, 1))
  );
  const isBalanceLoading = astroConsoleData.isPredictionBalanceLoading;
  const needsPredictionFunds = Boolean(
    selectedOutcome &&
      canAct &&
      !isBalanceLoading &&
      orderCost > availableUsdc
  );
  const needsTradingSetup = Boolean(
    selectedOutcome && canAct && !trading.isTradingSessionComplete
  );
  const isBelowMinimum = Boolean(selectedOutcome && orderCost > 0 && orderCost < 1);
  const hasInvalidLimitPrice = Boolean(
    selectedOutcome &&
      isLimitOrder &&
      (limitPriceDecimal <= 0 || limitPriceDecimal >= 1)
  );
  const predictionShortfall = Math.max(0, orderCost - availableUsdc);
  const canRefreshMarketQuote = Boolean(
    selectedOutcome &&
      !isLimitOrder &&
      selectedTokenId &&
      !isBusy &&
      (hasNoLiveAsk || hasLiveQuoteError)
  );
  const canConfirmBet =
    Boolean(stakeValue && stakeValue > 0) &&
    canAct &&
    !isBalanceLoading &&
    !isBelowMinimum &&
    !hasInvalidLimitPrice &&
    !marketQuoteBlocksConfirm &&
    !needsPredictionFunds &&
    !isBusy &&
    !isInlineProposalPending &&
    inlineStatus !== 'executed' &&
    Boolean(selectedTokenId);
  const handleConfirmBet = async () => {
    if (!selectedOutcome) return;
    if (confirmInFlightRef.current) return;

    if (needsPredictionFunds) {
      onAddPredictionFunds();
      return;
    }

    if (needsTradingSetup) {
      setTradeError(null);
      setIsConfirming(true);
      try {
        await trading.initializeTradingSession();
        setTradeError('Trading setup is ready. Confirm again to place this ticket.');
        toast.success('Trading setup is ready.');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Trading setup could not be completed.';
        setTradeError(message);
        toast.error(message);
      } finally {
        setIsConfirming(false);
      }
      return;
    }

    if (canRefreshMarketQuote) {
      setTradeError(null);
      setIsConfirming(true);
      try {
        const quote = await refreshSelectedMarketQuote();
        if (quote?.ask == null) {
          setTradeError(
            'No live ask is available for this market right now. Try again or use a limit order.'
          );
        }
      } finally {
        setIsConfirming(false);
      }
      return;
    }

    if (!canConfirmBet) return;

    setTradeError(null);
    setIsConfirming(true);
    confirmInFlightRef.current = true;

    try {
      let executionPrice = effectiveProbability;
      let requestedOrderShares = orderShares;

      if (!isLimitOrder) {
        const quote = await refreshSelectedMarketQuote();
        if (quote?.ask == null) {
          throw new Error(
            'No live ask is available for this market right now. Try again or use a limit order.'
          );
        }
        executionPrice = quote.ask;
        requestedOrderShares =
          stakeValue > 0 && executionPrice > 0 ? stakeValue / executionPrice : 0;
      }

      let proposal = canUseInlineProposal ? inlineProposal : null;
      if (!proposal?.proposalId) {
        proposal = await onPrepareBet(
          buildPolymarketBetPrompt(
            market,
            selectedOutcome,
            isLimitOrder ? requestedOrderShares : stake,
            {
              orderType: orderMode,
              limitPriceCents: isLimitOrder ? limitPrice : undefined,
            }
          ),
          selectedKey
        );
      }

      if (!proposal?.proposalId) {
        throw new Error('Swop could not create the approval ticket. Try again.');
      }

      const getApprovalResultForProposal = (
        candidate: AgentActionProposal
      ) => {
        if (
          existingApprovalResult?.payload?.proposalId ===
          candidate.proposalId
        ) {
          return existingApprovalResult;
        }
        if (
          candidate.approvalResult?.payload?.proposalId ===
          candidate.proposalId
        ) {
          return candidate.approvalResult;
        }
        return null;
      };

      let approvalResult =
        getApprovalResultForProposal(proposal) ||
        null;

      if (!approvalResult) {
        try {
          approvalResult = await onApproveInlineProposal(
            proposal.proposalId,
            approvalParams
          );
        } catch (approvalError) {
          if (!isProposalNoLongerPendingError(approvalError)) {
            throw approvalError;
          }

          proposal = await onPrepareBet(
            buildPolymarketBetPrompt(
              market,
              selectedOutcome,
              isLimitOrder ? requestedOrderShares : stake,
              {
                orderType: orderMode,
                limitPriceCents: isLimitOrder ? limitPrice : undefined,
              }
            ),
            selectedKey
          );
          if (!proposal?.proposalId) {
            throw new Error(
              'Swop could not refresh the approval ticket. Try again.'
            );
          }
          approvalResult = await onApproveInlineProposal(
            proposal.proposalId,
            approvalParams
          );
        }
      }
      if (!approvalResult?.payload?.proposalId) {
        throw new Error('Swop approval was not returned by the backend.');
      }
      persistAgentActionHandoff(approvalResult);

      const orderResult = await submitOrder({
        tokenId: selectedTokenId,
        conditionId: market.conditionId || market.id || undefined,
        size: isLimitOrder ? requestedOrderShares : stakeValue,
        side: 'BUY',
        negRisk: undefined,
        price: isLimitOrder ? limitPriceDecimal : undefined,
        acceptedPrice: executionPrice,
        isMarketOrder: !isLimitOrder,
        fillType: isLimitOrder ? undefined : 'FOK',
        showWalletUIs: false,
      });

      const feedExecution = resolvePredictionFeedExecution(orderResult, {
        side: 'BUY',
        cost: orderCost,
        potentialWin: requestedOrderShares,
        price: executionPrice,
        acceptedPrice: executionPrice,
      });
      const executedShares = feedExecution.potentialWin ?? requestedOrderShares;
      const executedCost = feedExecution.cost;
      const executedPrice = feedExecution.price;
      try {
        await postAgentPredictionToFeed({
          accessToken,
          user,
          market,
          orderId: orderResult.orderId,
          outcome: selectedLabel,
          side: 'BUY',
          cost: executedCost,
          potentialWin: executedShares,
          price: executedPrice,
          orderType: orderMode,
          executionFields: feedExecution.fields,
        });
      } catch (feedError) {
        console.warn(
          'Polymarket order placed, but feed posting failed:',
          feedError
        );
      }

      const completionDraft: Omit<
        AgentActionCompletion,
        | 'proposalId'
        | 'proposalNonce'
        | 'invocationId'
        | 'agentId'
        | 'groupId'
        | 'action'
        | 'toolType'
      > & { proposalId?: string } = {
        proposalId: proposal.proposalId,
        status: 'executed',
        provider: 'polymarket',
        title: question,
        subtitle: `${selectedLabel} · buy ${orderMode}`,
        subject: selectedLabel,
        side: 'BUY',
        stake: executedCost,
        toWin: Math.max(0, executedShares - executedCost),
        payout: executedShares,
        orderId: orderResult.orderId,
        explorerLabel: orderResult.orderId ? 'View order' : undefined,
        executionResult: {
          orderId: orderResult.orderId,
          marketId: market.conditionId || market.id,
          marketTitle: question,
          outcome: selectedLabel,
          side: 'BUY',
          shares: executedShares,
          price: executedPrice,
          cost: executedCost,
          orderType: orderMode,
          tokenId: selectedTokenId,
        },
      };

      const localCompletion = {
          ...completionDraft,
          proposalId: proposal.proposalId,
          placedAt: new Date().toISOString(),
        } as AgentActionCompletion;
      let completion = localCompletion;
      try {
        completion =
          (await completeAgentActionFromHandoff(
            completionDraft,
            accessToken
          )) || localCompletion;
      } catch (completionError) {
        console.warn(
          'Polymarket order placed, but Swop completion reporting failed:',
          completionError
        );
      }

      setLocalReceipt(completion);
      onInlineActionComplete(completion);
      toast.success('Prediction ticket confirmed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to place bet.';
      if (/No live ask is available/i.test(message) && selectedTokenId) {
        setLiveQuote({
          tokenId: selectedTokenId,
          status: 'unavailable',
          bid: null,
          ask: null,
          message: 'No live ask is available for this market right now.',
        });
      }
      setTradeError(message);
      toast.error(message);
    } finally {
      confirmInFlightRef.current = false;
      setIsConfirming(false);
    }
  };

  if (localReceipt) {
    if (hasRenderedReceiptIdentity(localReceipt, renderedReceiptIdentityKeys)) {
      return null;
    }

    return (
      <AgentActionReceiptCard
        receipt={localReceipt}
        onDone={() => setLocalReceipt(null)}
      />
    );
  }

  if (selectedOutcome) {
    const selectedShellClass = embeddedInGroup
      ? 'overflow-hidden bg-[#15171d] text-xs'
      : `${AGENT_PANEL_CLASS} overflow-hidden text-xs`;

    return (
      <div className={selectedShellClass}>
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-3.5 py-3">
          <button
            type="button"
            onClick={() => setSelectedOutcome(null)}
            disabled={isBusy}
            className="dm-btn grid h-7 w-7 place-items-center rounded-[8px] border border-white/[0.07] bg-black/25 text-[#9396a0] disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="dm-mono min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
            {isLimitOrder ? 'limit order · polymarket' : 'bet slip · polymarket'}
          </div>
          {timing && (
            <div className="dm-mono inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#ff5d63]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d63]" />
              {timing}
            </div>
          )}
        </div>

        <div className="p-3.5">
          <div
            className="mb-3.5 flex items-center justify-between gap-3 rounded-[11px] border px-3 py-2.5"
            style={{
              borderColor: `${selectedAccent}66`,
              background: `${selectedAccent}14`,
            }}
          >
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold text-[#eceef2]">
                {selectedLabel}
              </div>
              <div className="dm-mono mt-0.5 line-clamp-2 text-[10.5px] text-[#5a5e69]">
                {question}
              </div>
            </div>
            <div
              className="dm-mono flex-shrink-0 text-[17px] font-bold"
              style={{ color: selectedAccent }}
            >
              {isLimitOrder
                ? limitPrice
                  ? `${limitPrice}¢ limit`
                  : 'set limit'
                : selectedPriceLabel || 'mkt'}
            </div>
          </div>

          <div className="mb-3.5 grid grid-cols-2 rounded-[11px] border border-white/[0.07] bg-black/25 p-1">
            {(['market', 'limit'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setOrderMode(mode);
                  setTradeError(null);
                  if (mode === 'limit' && !limitPrice) {
                    setLimitPrice(String(Math.round(selectedProbability * 100)));
                  }
                }}
                disabled={isBusy}
                className={`dm-btn rounded-[9px] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] disabled:opacity-50 ${
                  orderMode === mode
                    ? 'bg-[#eceef2] text-[#071008]'
                    : 'text-[#737783] hover:text-[#eceef2]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {isLimitOrder && (
            <div className="mb-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  limit price
                </span>
                <span className="dm-mono text-[10px] text-[#5a5e69]">
                  current {selectedPriceLabel || 'mkt'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-[11px] border border-white/[0.07] bg-black px-3.5 py-2.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="99"
                  step="1"
                  value={limitPrice}
                  onChange={(event) =>
                    setLimitPrice(
                      event.target.value.replace(/[^\d]/g, '').slice(0, 2)
                    )
                  }
                  disabled={isBusy}
                  className="dm-mono min-w-0 flex-1 bg-transparent text-xl font-bold tracking-[-0.02em] text-[#eceef2] outline-none disabled:opacity-60"
                />
                <span className="dm-mono text-[11px] text-[#5a5e69]">
                  cents
                </span>
              </div>
            </div>
          )}

          <div className="rounded-[12px] border border-white/[0.07] bg-black/35 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                amount
              </span>
              <span className="dm-mono text-[10px] text-[#5a5e69]">
                {hasNoLiveAsk || hasLiveQuoteError
                  ? 'ask unavailable'
                  : isCheckingLiveAsk
                  ? 'checking ask'
                  : `${Math.round(effectiveProbability * 100)}¢ / share`}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-[11px] border border-white/[0.07] bg-black px-3.5 py-2.5">
              <span className="dm-mono text-xl font-bold text-[#9396a0]">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                disabled={isBusy}
                className="dm-mono min-w-0 flex-1 bg-transparent text-xl font-bold tracking-[-0.02em] text-[#eceef2] outline-none disabled:opacity-60"
              />
              <span className="dm-mono text-[11px] text-[#5a5e69]">
                USDC
              </span>
            </div>

            <div className="mt-3">
              <input
                type="range"
                min="1"
                max={amountDialMax}
                step="0.5"
                value={Math.min(
                  amountDialMax,
                  Math.max(1, Number.isFinite(stakeValue) ? stakeValue : 1)
                )}
                onChange={(event) =>
                  setStake(formatPredictionAmountInput(Number(event.target.value)))
                }
                disabled={isBusy}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#23262e] accent-[#3fe08f] disabled:cursor-wait disabled:opacity-60"
                aria-label="Adjust bet amount"
              />
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[1, 5, 10, 25].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setStake(String(chip))}
                  disabled={isBusy}
                  className="dm-btn rounded-[8px] border px-2 py-1.5 text-[11.5px] font-bold disabled:opacity-50"
                  style={{
                    borderColor:
                      Math.abs(stakeValue - chip) < 0.001
                        ? `${selectedAccent}66`
                        : 'rgba(255,255,255,0.07)',
                    background:
                      Math.abs(stakeValue - chip) < 0.001
                        ? `${selectedAccent}16`
                        : '#15171d',
                    color:
                      Math.abs(stakeValue - chip) < 0.001
                        ? selectedAccent
                        : '#9396a0',
                  }}
                >
                  ${chip}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2">
                <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  cost
                </div>
                <div className="dm-mono mt-1 text-[14px] font-bold text-[#eceef2]">
                  {formatCompactUsd(orderCost)}
                </div>
              </div>
              <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2">
                <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  shares
                </div>
                <div className="dm-mono mt-1 text-[14px] font-bold text-[#3fe08f]">
                  {hasNoLiveAsk || hasLiveQuoteError
                    ? '--'
                    : formatPredictionShares(orderShares)}
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-white/[0.07] pt-2">
              <span className="dm-mono text-xs text-[#9396a0]">to win</span>
              <span className="dm-mono text-[13px] font-bold text-[#3ddc97]">
                {hasNoLiveAsk || hasLiveQuoteError
                  ? '--'
                  : `+${formatCompactUsd(payout.profit)}`}
              </span>
            </div>
          </div>

          <div
            className={`mt-3 rounded-[10px] border px-3 py-2 text-[11px] ${
              hasNoLiveAsk
                ? 'border-[#ff5d63]/25 bg-[#ff5d63]/10 text-[#ffb2b6]'
                : hasLiveQuoteError
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : needsPredictionFunds
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : hasInvalidLimitPrice
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : isBelowMinimum
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : 'border-white/[0.07] bg-black/25 text-[#9396a0]'
            }`}
          >
            {isCheckingLiveAsk ? (
              'Checking the live Polymarket ask...'
            ) : hasNoLiveAsk ? (
              'No live ask is available for this market right now. Refresh or switch to a limit order.'
            ) : hasLiveQuoteError ? (
              liveQuote.message ||
              'Could not refresh the live ask. Try again or use a limit order.'
            ) : isBalanceLoading ? (
              'Checking Polymarket balance...'
            ) : hasInvalidLimitPrice ? (
              'Limit price must be between 1¢ and 99¢.'
            ) : isBelowMinimum ? (
              'Minimum Polymarket order is $1.00.'
            ) : needsPredictionFunds ? (
              <>
                Add funds first. Available pUSD is{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(availableUsdc)}
                </span>
                {predictionShortfall > 0
                  ? `, ${formatCompactUsd(predictionShortfall)} short.`
                  : '.'}
              </>
            ) : (
              <>
                Available pUSD{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(availableUsdc)}
                </span>
                .
              </>
            )}
          </div>
          {tradeError && (
            <div className="mt-2 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2 text-[11px] text-[#ffb2b6]">
              {tradeError}
            </div>
          )}
          {activeOrderStage && (
            <div className="mt-2 rounded-[10px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 px-3 py-2 text-[11px] text-[#a9f7cc]">
              {getInlineOrderStageHint(orderStage)}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmBet}
            disabled={
              (!canConfirmBet && !needsPredictionFunds && !canRefreshMarketQuote) ||
              isBusy
            }
            className={`dm-btn mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[11px] px-3 font-bold tracking-[0.08em] disabled:cursor-wait disabled:opacity-60 ${
              marketQuoteBlocksConfirm && !needsPredictionFunds
                ? 'border border-white/[0.07] bg-[#15171d] text-[#eceef2]'
                : 'bg-[#3fe08f] text-[#071008]'
            }`}
          >
            {(isSelectedPending ||
              isInlineProposalPending ||
              isConfirming ||
              isSubmittingOrder ||
              isCheckingLiveAsk) && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {needsPredictionFunds ? (
              <>
                <Plus className="h-3.5 w-3.5" />
                ADD FUNDS
              </>
            ) : needsTradingSetup
              ? isConfirming
                ? 'SETTING UP...'
                : 'ENABLE TRADING'
              : inlineStatus === 'executed'
              ? 'BET CONFIRMED'
              : activeOrderStage
              ? getInlineOrderStageButtonLabel(orderStage)
              : isCheckingLiveAsk
              ? 'CHECKING PRICE...'
              : canRefreshMarketQuote
              ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  REFRESH PRICE
                </>
              )
              : isConfirming
              ? 'APPROVING...'
              : isLimitOrder
              ? `CONFIRM LIMIT · ${formatCompactUsd(orderCost)} · ${formatPredictionShares(orderShares)} SH`
              : `CONFIRM BET · ${formatCompactUsd(orderCost)} · ${formatPredictionShares(orderShares)} SH`}
          </button>
          {inlineProposal?.proposalId && inlineStatus !== 'approved' && inlineStatus !== 'executed' && (
            <button
              type="button"
              onClick={() => onRejectProposal(inlineProposal.proposalId)}
              disabled={!canAct || isInlineProposalPending}
              className="dm-btn mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 text-[12px] font-semibold text-[#eceef2] disabled:cursor-wait disabled:opacity-60"
            >
              <Ban className="h-3.5 w-3.5" />
              Reject ticket
            </button>
          )}
          <div className="dm-mono mt-2 text-center text-[9.5px] text-[#5a5e69]">
            {inlineProposal?.proposalId
              ? 'Swop validated · self-custodied'
              : 'self-custodied · no chat prompt sent · swop book'}
          </div>
        </div>
      </div>
    );
  }

  if (embeddedInGroup) {
    const groupContextTitle = formatGroupedPolymarketMarketTitle(
      market,
      displayQuestion,
      groupTitle
    );
    const groupContextMeta = formatGroupedPolymarketMarketMeta(
      market,
      displayQuestion,
      groupTitle
    );

    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="mb-2 min-w-0">
          <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5a5e69]">
            {displayQuestion.kicker}
          </div>
          <div
            className="mt-1 line-clamp-2 min-w-0 break-words text-[12.5px] font-semibold leading-snug text-[#eceef2] [overflow-wrap:anywhere]"
            title={groupContextTitle}
          >
            {groupContextTitle}
          </div>
          {groupContextMeta ? (
            <div className="dm-mono mt-1 truncate text-[9.5px] font-semibold text-[#5a5e69]">
              {groupContextMeta}
            </div>
          ) : null}
        </div>
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <button
            type="button"
            onClick={() => setSelectedOutcome('yes')}
            disabled={isPreparing}
            className="dm-btn inline-flex h-11 min-w-0 max-w-full items-center justify-between gap-2 rounded-[9px] border border-[#3fe08f]/40 bg-[#3fe08f]/12 px-3 font-semibold text-[#eceef2] hover:bg-[#3fe08f]/18 disabled:cursor-wait disabled:opacity-70"
          >
            <span className="min-w-0 truncate">{outcomes.yes}</span>
            <span className="dm-mono shrink-0 font-bold text-[#3fe08f]">
              {yesPrice || 'mkt'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedOutcome('no')}
            disabled={isPreparing}
            className="dm-btn inline-flex h-11 min-w-0 max-w-full items-center justify-between gap-2 rounded-[9px] border border-white/[0.07] bg-[#15171d] px-3 font-semibold text-[#eceef2] hover:border-[#ff5d63]/35 hover:bg-[#ff5d63]/10 disabled:cursor-wait disabled:opacity-70"
          >
            <span className="min-w-0 truncate">{outcomes.no}</span>
            <span className="dm-mono shrink-0 font-bold text-[#3fe08f]">
              {noPrice || 'mkt'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${AGENT_PANEL_CLASS} overflow-hidden p-3 text-xs`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
            prediction market
          </div>
          <div className="mt-1 line-clamp-2 font-semibold leading-snug text-[#eceef2]">
            {question}
          </div>
        </div>
        {timing && (
          <span className="dm-mono shrink-0 rounded-[5px] border border-white/[0.07] bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3fe08f]">
            {timing}
          </span>
        )}
      </div>

      <MiniPolymarketChart market={market} preferLiveHistory={preferLiveChart} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSelectedOutcome('yes')}
          disabled={isPreparing}
          className="dm-btn inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-[8px] bg-[#3fe08f] px-2 font-semibold text-[#031008] hover:bg-[#64f2aa] disabled:cursor-wait disabled:opacity-70"
        >
          <span className="truncate">
            {outcomes.yes} {yesPrice}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedOutcome('no')}
          disabled={isPreparing}
          className="dm-btn inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-[8px] border border-[#ff5d63]/35 bg-[#ff5d63]/10 px-2 font-semibold text-[#ffb2b6] hover:bg-[#ff5d63]/20 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="truncate">
            {outcomes.no} {noPrice}
          </span>
        </button>
      </div>
      <div className="dm-mono mt-3 flex items-center justify-between border-t border-dashed border-white/[0.07] pt-2.5 text-[10px]">
        <span className="text-[#5a5e69]">self-custodied · swop book</span>
        <span className="text-[#9396a0]">tap an odd to bet →</span>
      </div>
    </div>
  );
}

function MiniPolymarketChart({
  market,
  preferLiveHistory,
}: {
  market: PolymarketMarketPreview;
  preferLiveHistory: boolean;
}) {
  const yesTokenId = getPolymarketTokenId(market, 'yes');
  const noTokenId = getPolymarketTokenId(market, 'no');
  const yesProbability = parsePolymarketProbability(market.yesPrice, 0.5);
  const noProbability = parsePolymarketProbability(
    market.noPrice,
    1 - yesProbability
  );
  const { yesHistory, noHistory, loading } = usePolymarketPriceHistory(
    yesTokenId,
    noTokenId,
    Boolean(preferLiveHistory && yesTokenId && noTokenId)
  );
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const seed =
    market.conditionId || market.id || market.slug || market.question || 'market';
  const { yesSeries, noSeries, tMin, tMax, pMin, pMax, hasLiveHistory } =
    useMemo(() => {
      const hasHistory = yesHistory.length >= 2 && noHistory.length >= 2;
      const yesSeriesNext = hasHistory
        ? yesHistory
        : buildSyntheticProbabilitySeries(yesProbability, `${seed}:yes`);
      const noSeriesNext = hasHistory
        ? noHistory
        : buildSyntheticProbabilitySeries(noProbability, `${seed}:no`);
      const combined = [...yesSeriesNext, ...noSeriesNext];
      const times = combined.map((point) => point.t);
      const values = combined.map((point) => point.p);
      const minValue = Math.max(0, Math.min(...values) - 0.08);
      const maxValue = Math.min(1, Math.max(...values) + 0.08);

      return {
        yesSeries: yesSeriesNext,
        noSeries: noSeriesNext,
        tMin: Math.min(...times),
        tMax: Math.max(...times),
        pMin: minValue,
        pMax: maxValue <= minValue ? Math.min(1, minValue + 0.1) : maxValue,
        hasLiveHistory: hasHistory,
      };
    }, [yesHistory, noHistory, yesProbability, noProbability, seed]);

  const yesPath = historyToMiniPath(yesSeries, tMin, tMax, pMin, pMax);
  const noPath = historyToMiniPath(noSeries, tMin, tMax, pMin, pMax);
  const chartWidth = 260;
  const chartHeight = 86;
  const activeYesPoint =
    activeIndex === null ? null : yesSeries[activeIndex] || null;
  const activeNoPoint = activeYesPoint
    ? getNearestHistoryPoint(noSeries, activeYesPoint.t)
    : null;
  const activeX = activeYesPoint
    ? ((activeYesPoint.t - tMin) / Math.max(1, tMax - tMin)) * chartWidth
    : null;
  const activeYesY = activeYesPoint
    ? chartHeight -
      ((activeYesPoint.p - pMin) / Math.max(0.0001, pMax - pMin)) *
        chartHeight
    : null;
  const activeNoY = activeNoPoint
    ? chartHeight -
      ((activeNoPoint.p - pMin) / Math.max(0.0001, pMax - pMin)) *
        chartHeight
    : null;
  const displayYesProbability = activeYesPoint?.p ?? yesProbability;
  const displayNoProbability = activeNoPoint?.p ?? noProbability;
  const activeTimeLabel = activeYesPoint
    ? formatPolymarketChartTime(activeYesPoint.t)
    : '';

  const updateActivePoint = useCallback(
    (clientX: number) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect || yesSeries.length < 2) return;

      const ratio = clampRatio((clientX - rect.left) / rect.width);
      setActiveIndex(Math.round(ratio * (yesSeries.length - 1)));
    },
    [yesSeries.length]
  );

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateActivePoint(event.clientX);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateActivePoint(event.clientX);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') {
      setActiveIndex(null);
    }
  };

  return (
    <div
      ref={chartRef}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={(event) => {
        if (yesSeries.length < 2) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        setActiveIndex((current) => {
          const nextIndex =
            current === null
              ? yesSeries.length - 1
              : current + (event.key === 'ArrowRight' ? 1 : -1);
          return Math.max(0, Math.min(yesSeries.length - 1, nextIndex));
        });
      }}
      className="group/chart cursor-crosshair rounded-[10px] border border-white/[0.07] bg-black/30 p-2 outline-none transition-colors hover:border-[#3fe08f]/30 focus-visible:border-[#3fe08f]/50 focus-visible:ring-2 focus-visible:ring-[#3fe08f]/15"
      aria-label="Interactive Polymarket probability chart. Hover, tap, or use arrow keys to inspect prices."
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="dm-mono text-[#9396a0]">full probability</span>
        <span className="text-[#5a5e69]">
          {activeTimeLabel || (loading ? 'loading' : hasLiveHistory ? 'live' : 'preview')}
        </span>
      </div>
      <svg
        viewBox="0 0 260 86"
        role="img"
        aria-label="Polymarket probability chart"
        className="h-24 w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`yes-fill-${hashId(seed)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7df7b2" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7df7b2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 18 H260 M0 43 H260 M0 68 H260" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        {yesPath && (
          <>
            <path
              d={`${yesPath} L 260 86 L 0 86 Z`}
              fill={`url(#yes-fill-${hashId(seed)})`}
              opacity="0.8"
            />
            <path
              d={yesPath}
              fill="none"
              stroke="#7df7b2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </>
        )}
        {noPath && (
          <path
            d={noPath}
            fill="none"
            stroke="#ff8791"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.75"
            strokeWidth="1.8"
          />
        )}
        {activeX !== null && (
          <>
            <line
              x1={activeX}
              x2={activeX}
              y1="0"
              y2="86"
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            {activeYesY !== null && (
              <circle
                cx={activeX}
                cy={activeYesY}
                r="3.5"
                fill="#7df7b2"
                stroke="#071008"
                strokeWidth="1.5"
              />
            )}
            {activeNoY !== null && (
              <circle
                cx={activeX}
                cy={activeNoY}
                r="3"
                fill="#ff8791"
                stroke="#071008"
                strokeWidth="1.5"
              />
            )}
          </>
        )}
      </svg>
      <div className="dm-mono mt-1 flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#3fe08f]">
          Yes {Math.round(displayYesProbability * 100)}%
        </span>
        {activeTimeLabel && (
          <span className="hidden rounded-full border border-white/[0.07] bg-black/35 px-2 py-0.5 text-[9px] text-[#9396a0] sm:inline">
            inspect
          </span>
        )}
        <span className="text-[#ffb2b6]">
          No {Math.round(displayNoProbability * 100)}%
        </span>
      </div>
    </div>
  );
}

function usePolymarketPriceHistory(
  yesTokenId: string | undefined,
  noTokenId: string | undefined,
  enabled: boolean
) {
  const [yesHistory, setYesHistory] = useState<HistoryPoint[]>([]);
  const [noHistory, setNoHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !yesTokenId || !noTokenId) {
      setYesHistory([]);
      setNoHistory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchOne = (tokenId: string) =>
      fetch(
        `/api/polymarket/prices-history?tokenId=${encodeURIComponent(
          tokenId
        )}&interval=max&fidelity=30`
      )
        .then((response) => (response.ok ? response.json() : { history: [] }))
        .then((payload) => {
          const raw = Array.isArray(payload?.history) ? payload.history : [];
          return raw
            .map((point: { t?: number; p?: number | string }) => ({
              t: Number(point.t),
              p: Number(point.p),
            }))
            .filter(
              (point: HistoryPoint) =>
                Number.isFinite(point.t) &&
                Number.isFinite(point.p) &&
                point.p >= 0 &&
                point.p <= 1
            );
        })
        .catch(() => [] as HistoryPoint[]);

    Promise.all([fetchOne(yesTokenId), fetchOne(noTokenId)]).then(
      ([yes, no]) => {
        if (cancelled) return;
        setYesHistory(yes);
        setNoHistory(no);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, yesTokenId, noTokenId]);

  return { yesHistory, noHistory, loading };
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function getNearestHistoryPoint(series: HistoryPoint[], timestamp: number) {
  if (!series.length) return null;

  return series.reduce((nearest, point) =>
    Math.abs(point.t - timestamp) < Math.abs(nearest.t - timestamp)
      ? point
      : nearest
  );
}

function formatPolymarketChartTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildSyntheticProbabilitySeries(endProbability: number, seed: string) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 24 * 60 * 60;
  const points = 18;
  const startProbability = clampProbability(
    endProbability + (seededRand(seed, 0) - 0.5) * 0.16
  );

  return Array.from({ length: points }, (_, index) => {
    const ratio = index / (points - 1);
    const trend =
      startProbability + (endProbability - startProbability) * ratio;
    const wave =
      Math.sin((ratio * Math.PI * 2.2) + seededRand(seed, 1) * 2) * 0.025;
    const noise = (seededRand(seed, index + 3) - 0.5) * 0.035;

    return {
      t: start + Math.round((now - start) * ratio),
      p: clampProbability(trend + wave + noise * (1 - ratio * 0.45)),
    };
  });
}

function historyToMiniPath(
  series: HistoryPoint[],
  tMin: number,
  tMax: number,
  pMin: number,
  pMax: number
) {
  if (series.length < 2) return '';
  const width = 260;
  const height = 86;
  const span = Math.max(1, tMax - tMin);
  const probabilitySpan = Math.max(0.0001, pMax - pMin);
  const points = series.map((point) => ({
    x: ((point.t - tMin) / span) * width,
    y: height - ((point.p - pMin) / probabilitySpan) * height,
  }));

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    const controlX = ((previous.x + next.x) / 2).toFixed(2);
    d += ` C ${controlX} ${previous.y.toFixed(2)}, ${controlX} ${next.y.toFixed(
      2
    )}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return d;
}

function seededRand(seed: string, salt: number) {
  let hash = 2166136261;
  const input = `${seed}:${salt}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function hashId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'market';
}

function getPolymarketRealtimeQuote(
  market: PolymarketMarketPreview,
  outcome: 'yes' | 'no'
): PolymarketLiveQuote {
  const tokenId = getPolymarketTokenId(market, outcome);
  const quote = tokenId ? market.realtimePrices?.[tokenId] : undefined;
  return {
    bid: quote?.bidPrice ?? null,
    ask: quote?.askPrice ?? null,
  };
}

async function fetchPolymarketLiveQuote(
  tokenId: string
): Promise<PolymarketLiveQuote> {
  const response = await apiFetch(
    `${POLYMARKET_BACKEND_PROXY_URL}/prices`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIds: [tokenId] }),
    }
  );

  if (!response.ok) {
    throw new Error('Could not refresh the Polymarket price.');
  }

  const body = await response.json();
  const quote = body?.[tokenId] ?? {};
  return {
    bid: parseLivePolymarketPrice(quote.bid),
    ask: parseLivePolymarketPrice(quote.ask),
  };
}

function groupPolymarketMarkets(
  markets: PolymarketMarketPreview[]
): PolymarketMarketGroup[] {
  const groups: PolymarketMarketGroup[] = [];
  const byKey = new Map<string, PolymarketMarketGroup>();

  markets.forEach((market) => {
    const eventKey = getPolymarketEventGroupKey(market);
    const key =
      eventKey ||
      `market:${market.conditionId || market.id || market.slug || market.question || groups.length}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.markets.push(market);
      return;
    }

    const nextGroup = {
      key,
      isEventGroup: Boolean(eventKey),
      markets: [market],
    };
    byKey.set(key, nextGroup);
    groups.push(nextGroup);
  });

  return groups;
}

function isSportsMarketGroup(group: PolymarketMarketGroup) {
  if (!group.isEventGroup) return false;
  return group.markets.some((market) => {
    const text = `${market.eventTitle || ''} ${market.question || ''}`;
    return Boolean(market.gameStartTime) || /\b(vs\.?|versus)\b/i.test(text);
  });
}

function getPolymarketEventGroupKey(market: PolymarketMarketPreview) {
  const eventSlug = normalizePolymarketEventSlug(market.eventSlug);
  if (eventSlug) return `event:${eventSlug}`;

  const eventTitle = normalizePolymarketEventTitle(market.eventTitle);
  if (eventTitle) return `event:${eventTitle.toLowerCase()}`;

  return '';
}

function normalizePolymarketEventSlug(slug?: string | null) {
  return (slug || '').trim().toLowerCase().replace(/-more-markets$/u, '');
}

function normalizePolymarketEventTitle(title?: string | null) {
  return (title || '')
    .trim()
    .replace(/\s*(?:[:|-]\s*)?more\s+markets\s*$/iu, '');
}

function humanizePolymarketEventSlug(slug?: string | null) {
  if (!slug) return '';
  return slug
    .replace(/-\d{4}-\d{2}-\d{2}.*/u, '')
    .split('-')
    .filter(Boolean)
    .map((part) =>
      part.length <= 4
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`
    )
    .join(' ');
}

function formatGroupedPolymarketMarketTitle(
  market: PolymarketMarketPreview,
  displayQuestion: PolymarketMarketDisplayLabel,
  groupTitle?: string
) {
  const question = market.question?.trim() || '';
  const normalizedGroupTitle = groupTitle?.trim() || '';
  const normalizedTitle = displayQuestion.title.trim();
  const groupKey = normalizeIntentText(normalizedGroupTitle);
  const titleKey = normalizeIntentText(normalizedTitle);
  const questionKey = normalizeIntentText(question);

  if (normalizedTitle && normalizedTitle !== 'Winner' && titleKey !== groupKey) {
    return normalizedTitle;
  }

  if (question && questionKey !== groupKey) {
    return question;
  }

  const slugTailContext = getPolymarketMarketSlugTailLabel(market);
  if (slugTailContext) {
    return slugTailContext;
  }

  const outcomes = getPolymarketOutcomeLabels(market);
  if (
    displayQuestion.kicker === 'moneyline' &&
    !areGenericPolymarketOutcomeLabels(outcomes)
  ) {
    return `${outcomes.yes} vs. ${outcomes.no}`;
  }

  const slugContext = humanizePolymarketEventSlug(
    market.slug || market.eventSlug || ''
  );
  if (slugContext && normalizeIntentText(slugContext) !== groupKey) {
    return slugContext;
  }

  if (displayQuestion.kicker === 'moneyline') return 'Moneyline winner';
  if (displayQuestion.kicker === 'spread') return 'Spread';
  if (displayQuestion.kicker === 'total') return 'Total';
  return 'Market';
}

function formatGroupedPolymarketMarketMeta(
  market: PolymarketMarketPreview,
  displayQuestion: PolymarketMarketDisplayLabel,
  groupTitle?: string
) {
  const pieces: string[] = [];
  const title = formatGroupedPolymarketMarketTitle(
    market,
    displayQuestion,
    groupTitle
  );
  const titleKey = normalizeIntentText(title);

  if (displayQuestion.detail) {
    pieces.push(displayQuestion.detail);
  }

  const readableSlugTail = getPolymarketMarketSlugTailLabel(market);

  if (
    readableSlugTail &&
    !titleKey.includes(normalizeIntentText(readableSlugTail))
  ) {
    pieces.push(readableSlugTail);
  }

  return pieces.slice(0, 2).join(' · ');
}

function getPolymarketMarketSlugTailLabel(market: PolymarketMarketPreview) {
  const slug = market.slug?.trim() || '';
  const eventSlug = market.eventSlug?.trim() || '';

  if (!slug || !eventSlug) return '';
  if (!slug.toLowerCase().startsWith(eventSlug.toLowerCase())) return '';

  return humanizePolymarketEventSlug(
    slug.slice(eventSlug.length).replace(/^-+/u, '')
  );
}

function areGenericPolymarketOutcomeLabels(outcomes: { yes: string; no: string }) {
  return (
    normalizeIntentText(outcomes.yes) === 'yes' &&
    normalizeIntentText(outcomes.no) === 'no'
  );
}

function orderPrefillMatchesMarket(
  prefill: PolymarketOrderPrefill | null | undefined,
  market: PolymarketMarketPreview,
  yesKey: string,
  noKey: string
) {
  if (!prefill) return false;
  if (prefill.marketKey) {
    return prefill.marketKey === yesKey || prefill.marketKey === noKey;
  }

  const marketKey =
    market.conditionId || market.id || market.slug || market.question || '';
  return Boolean(
    marketKey &&
      prefill.sourceText &&
      normalizeIntentText(prefill.sourceText).includes(
        normalizeIntentText(marketKey)
      )
  );
}

function formatPolymarketMarketTiming(market: PolymarketMarketPreview) {
  if (market.eventLive) return 'Live';
  const raw = market.gameStartTime;
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function inferPolymarketLeague(market: PolymarketMarketPreview) {
  const text = [
    market.eventTitle,
    market.eventSlug,
    market.question,
    market.slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(wnba|fever|valkyries|liberty|lynx|aces|storm|wings|sun|sky|dream|mercury|mystics|sparks|tempo)\b/.test(text)) {
    return 'WNBA';
  }
  if (/\b(nba|lakers|warriors|spurs|thunder|celtics|knicks|nets|heat|bucks|nuggets|suns|mavericks|clippers|kings|grizzlies|rockets|pelicans|jazz|trail blazers|timberwolves|pacers|magic|hornets|hawks|bulls|cavaliers|pistons|raptors|wizards|76ers)\b/.test(text)) {
    return 'NBA';
  }
  if (/\b(mlb|mets|marlins|yankees|dodgers|giants|red sox|cubs|cardinals|phillies|braves|padres|astros|rangers|mariners|blue jays|orioles|rays|twins|tigers|royals|guardians|white sox|athletics|angels|rockies|diamondbacks|brewers|pirates|reds|nationals)\b/.test(text)) {
    return 'MLB';
  }
  if (/\b(nfl|chiefs|eagles|cowboys|giants|jets|patriots|packers|bears|lions|vikings|bills|dolphins|ravens|steelers|bengals|browns|texans|colts|titans|jaguars|broncos|chargers|raiders|commanders|falcons|panthers|saints|buccaneers|cardinals|rams|seahawks|49ers)\b/.test(text)) {
    return 'NFL';
  }
  if (/\b(nhl|rangers|islanders|devils|bruins|maple leafs|canadiens|senators|sabres|penguins|flyers|capitals|hurricanes|panthers|lightning|red wings|blue jackets|blackhawks|wild|jets|predators|blues|stars|avalanche|utah|golden knights|ducks|kings|sharks|kraken|canucks|flames|oilers)\b/.test(text)) {
    return 'NHL';
  }
  if (/\b(soccer|epl|premier league|champions league|mls|liga|serie a|bundesliga|uefa|fifa)\b/.test(text)) {
    return 'SOCCER';
  }
  if (/\b(ufc|mma|boxing)\b/.test(text)) {
    return 'MMA';
  }

  return 'SPORTS';
}

function buildPolymarketBetPrompt(
  market: PolymarketMarketPreview,
  outcome: 'yes' | 'no',
  amount: string | number = 10,
  options?: {
    orderType?: 'market' | 'limit';
    limitPriceCents?: string;
  }
) {
  const tokenId = getPolymarketTokenId(market, outcome);
  const labels = getPolymarketOutcomeLabels(market);
  const outcomeLabel = outcome === 'yes' ? labels.yes : labels.no;
  const normalizedAmount = Number(amount);
  const stake =
    Number.isFinite(normalizedAmount) && normalizedAmount > 0
      ? normalizedAmount
      : 10;
  const orderType = options?.orderType || 'market';
  const limitPriceCents = Number(options?.limitPriceCents || 0);
  const limitPriceDecimal =
    orderType === 'limit' && Number.isFinite(limitPriceCents)
      ? limitPriceCents / 100
      : 0;
  const parts = [
    '@astro prepare a Polymarket BUY',
    outcome.toUpperCase(),
    orderType === 'limit'
      ? `limit order for ${stake} shares`
      : `bet for $${stake}`,
    `on "${
      market.question || market.eventTitle || 'this market'
    }"`,
  ];

  if (market.id) parts.push(`marketId ${market.id}`);
  if (market.conditionId) parts.push(`conditionId ${market.conditionId}`);
  if (market.slug) parts.push(`slug ${market.slug}`);
  if (tokenId) parts.push(`tokenId ${tokenId}`);
  parts.push(`outcome ${outcome}`);
  parts.push(`outcomeLabel "${outcomeLabel}"`);
  parts.push(`orderType ${orderType}`);
  if (orderType === 'limit' && limitPriceDecimal > 0) {
    parts.push(`price ${limitPriceDecimal}`);
  }

  return parts.join(' ');
}

function toAgentPredictionOptionalPrice(value: unknown) {
  const price = toAgentFeedNumber(value);
  return price > 0 ? price : undefined;
}

function formatAgentPredictionVolume(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string' && value.trim().startsWith('$')) {
    return value.trim();
  }

  const volume = Number(value);
  if (!Number.isFinite(volume) || volume <= 0) return undefined;

  return `${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(volume)} Vol.`;
}

async function postAgentPredictionToFeed({
  accessToken,
  user,
  market,
  orderId,
  outcome,
  side,
  cost,
  potentialWin,
  price,
  orderType,
  executionFields,
}: {
  accessToken?: string | null;
  user?: Partial<User> | null;
  market: PolymarketMarketPreview;
  orderId?: string | null;
  outcome: string;
  side: 'BUY' | 'SELL';
  cost: number;
  potentialWin?: number;
  price: number;
  orderType: string;
  executionFields?: Record<string, unknown>;
}) {
  const identity = getAgentFeedIdentity(user);
  if (!accessToken || !identity) return null;

  const outcomes = getPolymarketOutcomeLabels(market);
  const yesTokenId = getPolymarketTokenId(market, 'yes');
  const noTokenId = getPolymarketTokenId(market, 'no');
  const result = await postFeed(
    {
      postType: 'prediction',
      smartsiteId: identity.smartsiteId,
      userId: identity.userId,
      content: {
        marketId: market.conditionId || market.id || undefined,
        marketTitle: market.question || market.eventTitle || 'Prediction market',
        outcome,
        side,
        cost,
        potentialWin,
        price,
        orderId: orderId || undefined,
        orderType,
        ...executionFields,
        eventSlug: market.eventSlug || undefined,
        yesOutcome: outcomes.yes,
        noOutcome: outcomes.no,
        yesTokenId: yesTokenId || undefined,
        noTokenId: noTokenId || undefined,
        yesPrice: toAgentPredictionOptionalPrice(market.yesPrice),
        noPrice: toAgentPredictionOptionalPrice(market.noPrice),
        gameStartTime: market.gameStartTime || undefined,
        volume: formatAgentPredictionVolume(market.volume),
      },
    },
    accessToken
  );

  triggerAgentFeedRefresh();
  return result;
}
