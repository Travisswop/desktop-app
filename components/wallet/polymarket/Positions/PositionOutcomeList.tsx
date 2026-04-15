'use client';

import { useMemo } from 'react';
import type { PolymarketPosition } from '@/hooks/polymarket';
import { useTradeActivity } from '@/hooks/polymarket';
import PositionOutcomeCard from './PositionOutcomeCard';
import TradeOutcomeCard, {
  type AggregatedTradeOutcome,
} from './TradeOutcomeCard';

function shouldInclude(position: PolymarketPosition): boolean {
  const totalBought = position.totalBought || 0;
  const size = position.size || 0;
  const soldShares = Math.max(0, totalBought - size);
  const result =
    totalBought > 0 && (soldShares > 0 || position.redeemable);

  return result;
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
  const items = useMemo(() => {
    return (positions || []).filter(shouldInclude).sort((a, b) => {
      // Prefer newest-ending markets first when available.
      const aTime = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bTime = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bTime - aTime;
    });
  }, [positions]);

  const { data: trades = [] } = useTradeActivity({
    user: walletAddress,
    limit: 500,
    offset: 0,
    type: 'TRADE',
    side: '',
    sort: 'DESC',
  });

  const tradeOutcomes: AggregatedTradeOutcome[] = useMemo(() => {
    if (!trades.length) return [];

    type RawTrade = (typeof trades)[0];

    // Set of conditionId-outcomeIndex keys still present in the positions API.
    // If a BUY-only group has no matching position, the market settled to 0 → LOSS.
    const activePositionKeys = new Set(
      (positions || []).map((p) => `${p.conditionId}-${p.outcomeIndex}`),
    );

    // Step 1: group trades by conditionId-outcomeIndex
    const groups = new Map<string, RawTrade[]>();
    for (const t of trades) {
      const key = `${t.conditionId}-${t.outcomeIndex}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }

    const out: AggregatedTradeOutcome[] = [];

    for (const [baseKey, groupTrades] of groups.entries()) {
      // Step 2: sort oldest → newest within the group
      const sorted = [...groupTrades].sort(
        (a, b) => a.timestamp - b.timestamp,
      );

      // Step 3: detect per-cycle boundaries.
      // A new cycle starts when a BUY arrives after the accumulator already has
      // at least one SELL — the user re-entered the same outcome.
      let cycleIndex = 0;
      let buyShares = 0;
      let buyCost = 0;
      let sellShares = 0;
      let sellProceeds = 0;
      let hadSell = false;
      let title = sorted[0].title;
      let outcome = sorted[0].outcome;
      let icon = sorted[0].icon;

      const flushCycle = () => {
        if (buyShares <= 0) return;

        if (sellShares <= 0) {
          // BUY-only: no manual sell recorded.
          // If the position is gone from the API, the market settled to 0 → full LOSS.
          // If the position still exists (active or redeemable), PositionOutcomeCard
          // handles it — skip here to avoid duplication.
          if (!activePositionKeys.has(baseKey)) {
            const avgBuyPrice = buyCost > 0 ? buyCost / buyShares : null;
            out.push({
              key: `${baseKey}-c${cycleIndex}`,
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
          }
          buyShares = 0; buyCost = 0; sellShares = 0;
          sellProceeds = 0; hadSell = false;
          return;
        }

        // Normal buy+sell cycle
        const avgBuyPrice = buyCost > 0 ? buyCost / buyShares : null;
        const avgSellPrice = sellProceeds > 0 ? sellProceeds / sellShares : null;
        const realizedPnl =
          avgBuyPrice != null && avgSellPrice != null
            ? (avgSellPrice - avgBuyPrice) * sellShares
            : 0;

        out.push({
          key: `${baseKey}-c${cycleIndex}`,
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
          // Re-entry: BUY after we already sold in this cycle → close current cycle first
          if (hadSell) flushCycle();
          buyShares += Number(t.size || 0);
          buyCost += Number(t.size || 0) * Number(t.price || 0);
        } else {
          sellShares += Number(t.size || 0);
          sellProceeds += Number(t.size || 0) * Number(t.price || 0);
          hadSell = true;
        }
      }

      // Flush the final cycle
      flushCycle();
    }

    return out;
  }, [trades, positions]);

  // Keys already covered by the positions API — used to deduplicate trade outcomes.
  // Use conditionId-outcomeIndex (base key) so all cycles for an active position
  // are suppressed, not just c0. Cycle keys have the form `baseKey-cN`.
  const positionKeys = useMemo(
    () =>
      new Set(items.map((p) => `${p.conditionId}-${p.outcomeIndex}`)),
    [items],
  );

  // Only include trade outcomes not already covered by a PositionOutcomeCard.
  // Strip the cycle suffix (-cN) before checking so every cycle for the same
  // position is consistently included or excluded.
  const supplementalTradeOutcomes = useMemo(
    () =>
      tradeOutcomes.filter((t) => {
        const baseKey = t.key.replace(/-c\d+$/, '');
        return !positionKeys.has(baseKey);
      }),
    [tradeOutcomes, positionKeys],
  );

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
        <PositionOutcomeCard
          key={`${position.conditionId}-${position.outcomeIndex}`}
          position={position}
          onRedeem={onRedeem}
          isRedeeming={redeemingAsset === position.asset}
          canRedeem={canRedeem}
        />
      ))}
      {supplementalTradeOutcomes.map((item) => (
        <TradeOutcomeCard key={item.key} item={item} />
      ))}
    </div>
  );
}
