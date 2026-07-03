'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  Share2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  usePolymarketCollateralBalance,
  useUserPositions,
  useActiveOrders,
  usePolymarketTeams,
  type PolymarketPosition,
  type PolymarketMarket,
  type TeamsMap,
} from '@/hooks/polymarket';
import { useTrading } from '@/providers/polymarket';
import {
  marketRouteKey,
  useMarketDetailStore,
} from '@/zustandStore/marketDetailStore';
import PositionShareModal from '@/components/wallet/polymarket/Positions/PositionShareModal';

interface PredictionsCardProps {
  safeAddress: string | undefined;
  /** Open the deposit/withdraw modal pre-set to a tab. */
  onTransfer: (tab: 'deposit' | 'withdraw') => void;
  /** Open the full predictions panel; optionally land on a specific tab. */
  /**
   * Open the predictions panel. Use 'main' (or omit) for the bento overview;
   * 'orders' / 'bets' / 'history' open the panel directly to a drill-down
   * view that mirrors wireframe screens A4 / My bets / A5.
   */
  onOpenPanel: (view?: 'main' | 'bets' | 'orders' | 'history') => void;
  isTradingDisabled?: boolean;
  disabledTransferReason?: string;
}

const POS_GREEN = '#19a974';
const NEG_RED = '#e5484d';
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

function Sparkline({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  const path =
    trend === 'down'
      ? 'M0,8 C20,14 35,10 50,18 C70,24 85,18 100,24 C120,30 135,26 150,32'
      : trend === 'flat'
        ? 'M0,20 C25,18 50,22 75,20 C100,18 125,22 150,20'
        : 'M0,30 C20,26 30,30 45,22 C60,14 75,20 90,12 C110,6 130,14 150,8';
  const color =
    trend === 'down' ? NEG_RED : trend === 'flat' ? '#9ca3af' : POS_GREEN;
  return (
    <svg
      viewBox="0 0 150 40"
      preserveAspectRatio="none"
      className="w-full h-11 block"
    >
      <defs>
        <linearGradient
          id={`predcard-${trend}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L150,40 L0,40 Z`}
        fill={`url(#predcard-${trend})`}
      />
      <path
        d={path}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeltaTag({ pct }: { pct: number }) {
  if (!Number.isFinite(pct) || pct === 0) return null;
  const positive = pct > 0;
  const Arrow = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums ${
        positive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'
      }`}
    >
      <Arrow className="w-3.5 h-3.5" strokeWidth={2.5} />
      {positive ? '+' : ''}
      {pct.toFixed(2)}%
    </span>
  );
}

function timeUntil(endIso: string | undefined): string {
  if (!endIso) return '';
  const ms = new Date(endIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return '';
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d left`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs >= 1) return `${hrs}h left`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins}m left`;
}

type EventTeamMeta = NonNullable<PolymarketMarket['eventTeams']>[number];

function isBinaryOutcome(label: string): boolean {
  return /^(yes|no)$/i.test(label.trim());
}

function resolveTeamMeta(
  label: string,
  teamsMap: TeamsMap | undefined,
): EventTeamMeta | undefined {
  if (!teamsMap || !label) return undefined;
  const lower = label.trim().toLowerCase();
  if (!lower) return undefined;
  const hit =
    teamsMap.byKey.get(lower) ||
    teamsMap.byKey.get(lower.split(/\s+/).pop() ?? '');
  if (!hit) return undefined;
  return {
    id: hit.id,
    name: hit.name,
    league: hit.sport,
    logo: hit.logoUrl,
    abbreviation: hit.abbreviation,
    color: typeof hit.color === 'string' ? hit.color : undefined,
  };
}

function positionLooksLikeMatchup(
  position: PolymarketPosition,
  yesOutcomeName: string,
  noOutcomeName: string,
): boolean {
  if (!position.eventSlug) return false;
  if (isBinaryOutcome(yesOutcomeName) || isBinaryOutcome(noOutcomeName)) {
    return false;
  }
  return /\b(vs\.?|v\.?|at)\b|@/i.test(position.title);
}

function positionToDetailMarket(
  position: PolymarketPosition,
  teamsMap: TeamsMap | undefined,
): PolymarketMarket {
  const isYesPos = position.outcomeIndex === 0;
  const yesTokenId = isYesPos
    ? position.asset
    : position.oppositeAsset;
  const noTokenId = isYesPos
    ? position.oppositeAsset
    : position.asset;
  const yesOutcomeName = isYesPos
    ? position.outcome
    : position.oppositeOutcome;
  const noOutcomeName = isYesPos
    ? position.oppositeOutcome
    : position.outcome;
  const yesPrice = isYesPos
    ? position.curPrice
    : 1 - position.curPrice;
  const noPrice = isYesPos
    ? 1 - position.curPrice
    : position.curPrice;

  const yesTeam = resolveTeamMeta(yesOutcomeName, teamsMap);
  const noTeam = resolveTeamMeta(noOutcomeName, teamsMap);
  const eventTeams: EventTeamMeta[] | undefined =
    yesTeam && noTeam
      ? [yesTeam, noTeam]
      : positionLooksLikeMatchup(
            position,
            yesOutcomeName,
            noOutcomeName,
          )
        ? [
            yesTeam ?? { name: yesOutcomeName },
            noTeam ?? { name: noOutcomeName },
          ]
        : undefined;

  return {
    id: position.conditionId,
    conditionId: position.conditionId,
    question: position.title,
    slug: position.slug,
    active: !position.redeemable,
    closed: position.redeemable,
    icon: position.icon,
    eventSlug: position.eventSlug,
    outcomes: JSON.stringify([yesOutcomeName, noOutcomeName]),
    outcomePrices: JSON.stringify([
      String(yesPrice),
      String(noPrice),
    ]),
    clobTokenIds: JSON.stringify([yesTokenId, noTokenId]),
    negRisk: position.negativeRisk,
    endDateIso: position.endDate,
    eventTeams,
  };
}

/**
 * Compact predictions card for the wallet page — matches the design from
 * screen G of the wireframes. Shows balance + sparkline, deposit/withdraw,
 * P/L stat strip, and a list of top open bets. The section action opens
 * the full PredictionsPanel; each bet opens its market detail page.
 */
export default function PredictionsCard({
  safeAddress,
  onTransfer,
  onOpenPanel,
  isTradingDisabled = false,
  disabledTransferReason,
}: PredictionsCardProps) {
  const router = useRouter();
  const { portfolioAddresses } = useTrading();
  const stashMarketDetail = useMarketDetailStore((s) => s.set);
  const { data: teamsData } = usePolymarketTeams();
  const [sharePosition, setSharePosition] =
    useState<PolymarketPosition | null>(null);
  const portfolioAddressInput = portfolioAddresses.length
    ? portfolioAddresses
    : safeAddress;
  const {
    usdcBalance,
    legacyUsdcBalance,
    isLoading: balanceLoading,
    isNormalizingCollateral,
  } = usePolymarketCollateralBalance(portfolioAddressInput);
  const { data: positions } = useUserPositions(portfolioAddressInput);
  const { data: activeOrders = [] } = useActiveOrders(null, safeAddress);

  const activePositions = useMemo<PolymarketPosition[]>(
    () => (positions ?? []).filter((p) => p.size > 0 && !p.redeemable),
    [positions],
  );

  const openPositionsValue = useMemo(
    () => activePositions.reduce((s, p) => s + p.currentValue, 0),
    [activePositions],
  );
  const totalPnl = useMemo(
    () => activePositions.reduce((s, p) => s + p.cashPnl, 0),
    [activePositions],
  );
  const totalCost = useMemo(
    () => activePositions.reduce((s, p) => s + p.size * p.avgPrice, 0),
    [activePositions],
  );
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  // pUSD only — legacy USDC.e is surfaced separately below while it converts.
  const portfolioValue = usdcBalance + openPositionsValue;

  const trend: 'up' | 'down' | 'flat' =
    totalPnl > 0.01 ? 'up' : totalPnl < -0.01 ? 'down' : 'flat';

  // Format the big balance with a quieter cents portion (matches screen G:
  // "$128,304" + smaller ".59").
  const [intPart, decPart] = useMemo(() => {
    const formatted = portfolioValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dotIdx = formatted.lastIndexOf('.');
    return dotIdx === -1
      ? [formatted, '00']
      : [formatted.slice(0, dotIdx), formatted.slice(dotIdx + 1)];
  }, [portfolioValue]);

  const topBets = useMemo(
    () =>
      [...activePositions]
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 4),
    [activePositions],
  );

  const stakedTotal = useMemo(
    () => activePositions.reduce((s, p) => s + p.size * p.avgPrice, 0),
    [activePositions],
  );

  const navigateToPosition = useCallback(
    (position: PolymarketPosition) => {
      const market = positionToDetailMarket(position, teamsData);
      const key = marketRouteKey(market);
      if (!key) {
        onOpenPanel('bets');
        return;
      }
      stashMarketDetail(key, {
        market,
        initialOutcome: position.outcomeIndex === 0 ? 'yes' : 'no',
        yesShares: position.outcomeIndex === 0 ? position.size : 0,
        noShares: position.outcomeIndex === 1 ? position.size : 0,
        initialAmount: (
          position.initialValue ||
          position.size * position.avgPrice
        ).toFixed(2),
      });
      router.push(`/prediction/market/${encodeURIComponent(key)}`);
    },
    [onOpenPanel, router, stashMarketDetail, teamsData],
  );

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.06] p-[22px] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      {/* Top: balance + delta */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] text-gray-500 font-medium tracking-tight">
            Predictions balance
          </div>
          <div className="mt-1.5 leading-none tabular-nums">
            {balanceLoading ? (
              <div className="w-48 h-9 bg-gray-200 animate-pulse rounded" />
            ) : (
              <>
                <span className="text-[38px] font-semibold tracking-[-1.6px] text-gray-900">
                  ${intPart}
                </span>
                <span className="text-[26px] font-semibold tracking-[-0.8px] text-gray-400">
                  .{decPart}
                </span>
              </>
            )}
          </div>
          {legacyUsdcBalance > 0.005 && !balanceLoading && (
            <div className="mt-1 text-[11px] font-medium text-gray-500">
              {isNormalizingCollateral
                ? `Converting $${legacyUsdcBalance.toFixed(2)} USDC.e to pUSD`
                : `$${legacyUsdcBalance.toFixed(2)} USDC.e converting to pUSD`}
            </div>
          )}
        </div>
        <DeltaTag pct={totalPnlPct} />
      </div>

      <div className="mt-4">
        <Sparkline trend={trend} />
      </div>

      {/* Deposit / Withdraw — full-width 2-col, deposit dark */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => onTransfer('deposit')}
          disabled={isTradingDisabled}
          title={disabledTransferReason}
          className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-black text-white border border-black hover:bg-gray-800 transition-colors text-[13px] font-semibold disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Deposit
          <span
            className="ml-1 text-[10.5px] text-white/55 font-mono"
            style={{ fontFamily: MONO }}
          >
            from wallet
          </span>
        </button>
        <button
          onClick={() => onTransfer('withdraw')}
          disabled={isTradingDisabled}
          title={disabledTransferReason}
          className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-white text-gray-900 border border-black/[0.06] hover:bg-gray-50 transition-colors text-[13px] font-semibold disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        >
          <ArrowUpFromLine className="w-3.5 h-3.5" />
          Withdraw
          <span
            className="ml-1 text-[10.5px] text-gray-400 font-mono"
            style={{ fontFamily: MONO }}
          >
            to wallet
          </span>
        </button>
      </div>

      {/* P/L stat strip — 3 columns divided by hairlines */}
      <div className="grid grid-cols-3 mt-4 pt-3.5 border-t border-black/[0.06]">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-gray-500 font-semibold">
            Total P/L
          </div>
          <div
            className="flex items-baseline gap-1 mt-1 tabular-nums"
            style={{ fontFamily: MONO }}
          >
            <span
              className={`text-base font-semibold ${
                totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {totalPnl >= 0 ? '+' : '−'}$
              {Math.abs(totalPnl).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="border-l border-black/[0.06] pl-3.5">
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-gray-500 font-semibold">
            Open orders
          </div>
          <div
            className="flex items-baseline gap-1 mt-1 tabular-nums"
            style={{ fontFamily: MONO }}
          >
            <span className="text-base font-semibold text-gray-900">
              {activeOrders.length}
            </span>
          </div>
        </div>
        <div className="border-l border-black/[0.06] pl-3.5">
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-gray-500 font-semibold">
            Open bets
          </div>
          <div
            className="flex items-baseline gap-1 mt-1 tabular-nums"
            style={{ fontFamily: MONO }}
          >
            <span className="text-base font-semibold text-gray-900">
              {activePositions.length}
            </span>
            {stakedTotal > 0 && (
              <span className="text-[10.5px] text-gray-500 font-medium">
                · ${stakedTotal.toFixed(0)} staked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Open bets list */}
      <div className="mt-4 pt-3.5 border-t border-black/[0.06]">
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="text-[10.5px] text-gray-500 font-bold tracking-[1.2px] uppercase"
            style={{ fontFamily: MONO }}
          >
            Open bets · {activePositions.length}
          </span>
          <button
            onClick={() => onOpenPanel('bets')}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold border border-black/[0.06] bg-white text-gray-900 hover:bg-gray-50 transition-colors"
          >
            All
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {topBets.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-500 font-medium">
              No open bets yet
            </p>
            <button
              onClick={() => onOpenPanel('main')}
              className="mt-1.5 text-xs font-semibold text-gray-900 underline-offset-4 hover:underline"
            >
              Browse markets →
            </button>
          </div>
        ) : (
          topBets.map((bet, i) => {
            const positive = bet.cashPnl >= 0;
            // Implied "queue" width — how much of the position has appreciated
            // toward $1 settlement. Used for the visual progress bar.
            const pct = Math.max(
              0,
              Math.min(100, Math.round(bet.curPrice * 100)),
            );
            const stake = bet.size * bet.avgPrice;
            const projected = bet.size * 1; // settlement at $1 if YES wins
            const timeLabel = timeUntil(bet.endDate);
            return (
              <div
                key={`${bet.conditionId}-${bet.outcomeIndex}`}
                className={`group w-full py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 ${
                  i === 0 ? '' : 'border-t border-black/[0.04]'
                } hover:bg-gray-50/60 transition-colors -mx-1 px-1 rounded-md`}
              >
                <button
                  type="button"
                  onClick={() => navigateToPosition(bet)}
                  className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 text-left"
                  aria-label={`Open ${bet.title}`}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-bold tracking-[0.4px] ${
                          positive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                        style={{ fontFamily: MONO }}
                      >
                        {bet.outcome.toUpperCase()} ·{' '}
                        {Math.round(bet.curPrice * 100)}¢
                      </span>
                      <span
                        className="text-[10px] text-gray-400"
                        style={{ fontFamily: MONO }}
                      >
                        {timeLabel}
                      </span>
                    </div>
                    <div className="truncate text-[13px] font-semibold tracking-tight">
                      {bet.title}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: positive ? POS_GREEN : NEG_RED,
                          }}
                        />
                      </div>
                      <span
                        className="min-w-[28px] text-right text-[10.5px] font-semibold text-gray-500 tabular-nums"
                        style={{ fontFamily: MONO }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-[13px] font-semibold tracking-tight tabular-nums"
                      style={{ fontFamily: MONO }}
                    >
                      ${stake.toFixed(2)}
                    </div>
                    <div
                      className={`mt-0.5 text-[10.5px] font-semibold tabular-nums ${
                        positive ? 'text-emerald-600' : 'text-red-600'
                      }`}
                      style={{ fontFamily: MONO }}
                    >
                      → ${projected.toFixed(2)}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSharePosition(bet)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-gray-500 transition-colors hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black/20"
                  aria-label={`Share prediction for ${bet.title}`}
                  title="Share prediction"
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={2.3} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {sharePosition && (
        <PositionShareModal
          position={sharePosition}
          isOpen={!!sharePosition}
          onClose={() => setSharePosition(null)}
          statusOverride="open"
        />
      )}
    </div>
  );
}
