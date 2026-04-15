'use client';

import { useMemo } from 'react';
import React from 'react';
import type { PolymarketPosition, TradeActivity } from '@/hooks/polymarket';
import { useTradeActivity } from '@/hooks/polymarket';
import PositionOutcomeCard from './PositionOutcomeCard';
import TradeOutcomeCard, {
  type AggregatedTradeOutcome,
} from './TradeOutcomeCard';

// ─── Stable fallback ────────────────────────────────────────────────────────
// Must live outside the component so its reference never changes.
// The `= []` inline fallback in destructuring creates a new array every render,
// which would make the tradeOutcomes useMemo recompute on every render even
// when the hook is disabled (walletAddress undefined).
const EMPTY_TRADES: TradeActivity[] = [];

// ─── Internal type for cycle detection output ────────────────────────────────
// Carries baseKey and buyOnly so step-2 useMemo can filter without regex.
type CycleEntry = AggregatedTradeOutcome & {
  baseKey: string;
  buyOnly: boolean;
};

// ─── Memoised child components ───────────────────────────────────────────────
// Prevents all cards from re-rendering when only one card's props changed
// (e.g. redeemingAsset flips for a single position, or parent re-renders due
// to positions polling).
const MemoPositionOutcomeCard = React.memo(PositionOutcomeCard);
const MemoTradeOutcomeCard = React.memo(TradeOutcomeCard);

function shouldInclude(position: PolymarketPosition): boolean {
  const totalBought = position.totalBought || 0;
  const size = position.size || 0;
  const soldShares = Math.max(0, totalBought - size);
  return totalBought > 0 && (soldShares > 0 || position.redeemable);
}

export default function PositionOutcomeList({
  positions,
  walletAddress,
  onRedeem,
  redeemingAsset,
  canRedeem,
}: {
  positions: PolymarketPosition[];
  walletAddress?: string | undefined;
  onRedeem?: (position: PolymarketPosition) => void;
  redeemingAsset?: string | null;
  canRedeem?: boolean;
}) {
  // ── Positions from API filtered to outcome-eligible entries ─────────────
  const items = useMemo(() => {
    return (positions || []).filter(shouldInclude).sort((a, b) => {
      const aTime = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bTime = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bTime - aTime;
    });
  }, [positions]);

  // ── Trade activity ───────────────────────────────────────────────────────
  const { data: tradesData } = useTradeActivity({
    user: walletAddress,
    limit: 500,
    offset: 0,
    type: 'TRADE',
    side: '',
    sort: 'DESC',
  });
  // Use the stable EMPTY_TRADES constant instead of an inline `= []` fallback.
  // An inline fallback creates a new reference on every render, which would
  // make cycleEntries recompute even when the hook is disabled.
  const trades = tradesData ?? EMPTY_TRADES;

  // ── Step 1: Cycle detection — depends ONLY on trades ────────────────────
  // This is the expensive operation (grouping + sorting 100+ trades).
  // Isolated from `positions` so that positions polling (every N seconds)
  // does NOT re-trigger it. It only reruns when new trade data arrives
  // (React Query staleTime: 30s).
  const cycleEntries = useMemo((): CycleEntry[] => {
    if (!trades.length) return [];

    const groups = new Map<string, TradeActivity[]>();
    for (const t of trades) {
      const key = `${t.conditionId}-${t.outcomeIndex}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }

    const out: CycleEntry[] = [];

    for (const [baseKey, groupTrades] of groups.entries()) {
      const sorted = [...groupTrades].sort(
        (a, b) => a.timestamp - b.timestamp,
      );

      let cycleIndex = 0;
      let buyShares = 0;
      let buyCost = 0;
      let sellShares = 0;
      let sellProceeds = 0;
      let hadSell = false;
      let title = sorted[0].title;
      let outcome = sorted[0].outcome;
      let icon = sorted[0].icon;

      const flush = () => {
        if (buyShares <= 0) return;

        if (sellShares <= 0) {
          // BUY-only — no manual sell. Mark as buyOnly=true so step-2 can
          // decide whether to include it based on positions API state.
          // (If the position is still active/redeemable, skip; if gone → LOSS.)
          const avgBuyPrice = buyCost > 0 ? buyCost / buyShares : null;
          out.push({
            key: `${baseKey}-c${cycleIndex}`,
            baseKey,
            cycleIndex,
            buyOnly: true,
            title,
            outcome,
            icon,
            boughtShares: buyShares,
            soldShares: buyShares,
            avgBuyPrice,
            avgSellPrice: 0,
            realizedPnl: -buyCost,
          });
          cycleIndex++;
          buyShares = 0; buyCost = 0; sellShares = 0;
          sellProceeds = 0; hadSell = false;
          return;
        }

        // Normal buy+sell cycle
        const avgBuyPrice = buyCost > 0 ? buyCost / buyShares : null;
        const avgSellPrice =
          sellProceeds > 0 ? sellProceeds / sellShares : null;
        const realizedPnl =
          avgBuyPrice != null && avgSellPrice != null
            ? (avgSellPrice - avgBuyPrice) * sellShares
            : 0;

        out.push({
          key: `${baseKey}-c${cycleIndex}`,
          baseKey,
          cycleIndex,
          buyOnly: false,
          title,
          outcome,
          icon,
          boughtShares: buyShares,
          soldShares: sellShares,
          avgBuyPrice,
          avgSellPrice,
          realizedPnl,
        });

        cycleIndex++;
        buyShares = 0; buyCost = 0; sellShares = 0;
        sellProceeds = 0; hadSell = false;
      };

      for (const t of sorted) {
        if (t.title) title = t.title;
        if (t.outcome) outcome = t.outcome;
        if (t.icon) icon = t.icon;

        if (t.side === 'BUY') {
          if (hadSell) flush();
          buyShares += Number(t.size || 0);
          buyCost += Number(t.size || 0) * Number(t.price || 0);
        } else {
          sellShares += Number(t.size || 0);
          sellProceeds += Number(t.size || 0) * Number(t.price || 0);
          hadSell = true;
        }
      }

      flush();
    }

    return out;
  }, [trades]); // ← trades only — positions polling does NOT retrigger this

  // ── Step 2: Settlement filter — cheap, depends on positions ─────────────
  // Runs when positions polling updates (but cycleEntries stays cached).
  // Filters out BUY-only entries whose position still exists in the API
  // (those are shown by PositionOutcomeCard instead).
  const tradeOutcomes: AggregatedTradeOutcome[] = useMemo(() => {
    if (!cycleEntries.length) return [];

    const activePositionKeys = new Set(
      (positions || []).map(
        (p) => `${p.conditionId}-${p.outcomeIndex}`,
      ),
    );

    return cycleEntries
      .filter(
        (e) => !e.buyOnly || !activePositionKeys.has(e.baseKey),
      )
      .map(
        // Strip internal fields before passing to child components
        ({ key, title, outcome, icon, boughtShares, soldShares,
           avgBuyPrice, avgSellPrice, realizedPnl }): AggregatedTradeOutcome => ({
          key, title, outcome, icon, boughtShares, soldShares,
          avgBuyPrice, avgSellPrice, realizedPnl,
        }),
      );
  }, [cycleEntries, positions]); // cycleEntries only changes every 30s

  // ── Deduplication ────────────────────────────────────────────────────────
  // positionKeys uses conditionId-outcomeIndex (no cycle suffix).
  // baseKey is already stored on CycleEntry so no regex needed.
  const positionKeys = useMemo(
    () =>
      new Set(items.map((p) => `${p.conditionId}-${p.outcomeIndex}`)),
    [items],
  );

  const supplementalTradeOutcomes = useMemo(
    () =>
      tradeOutcomes.filter((t) => {
        // baseKey was stripped when mapping from CycleEntry but is not on
        // AggregatedTradeOutcome. Re-derive it from the key (conditionId-outcomeIndex-cN).
        // The key format is deterministic: everything before the last `-cN` is the baseKey.
        const lastDash = t.key.lastIndexOf('-c');
        const baseKey = lastDash !== -1 ? t.key.slice(0, lastDash) : t.key;
        return !positionKeys.has(baseKey);
      }),
    [tradeOutcomes, positionKeys],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  const hasPositionOutcomes = items.length > 0;
  const hasSupplementalTrades = supplementalTradeOutcomes.length > 0;

  if (!hasPositionOutcomes && !hasSupplementalTrades) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm">
          No completed outcomes yet. Sell shares or wait for a market
          to settle to see Win/Loss.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((position) => (
        <MemoPositionOutcomeCard
          key={`${position.conditionId}-${position.outcomeIndex}`}
          position={position}
          onRedeem={onRedeem}
          isRedeeming={redeemingAsset === position.asset}
          canRedeem={canRedeem}
        />
      ))}
      {supplementalTradeOutcomes.map((item) => (
        <MemoTradeOutcomeCard key={item.key} item={item} />
      ))}
    </div>
  );
}
