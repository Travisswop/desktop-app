'use client';

import { useMemo } from 'react';
import type { PolymarketPosition } from '@/hooks/polymarket';
import { useTradeActivity } from '@/hooks/polymarket';
import PositionOutcomeCard from './PositionOutcomeCard';
import TradeOutcomeCard, { type AggregatedTradeOutcome } from './TradeOutcomeCard';

function shouldInclude(position: PolymarketPosition): boolean {
  const totalBought = position.totalBought || 0;
  const size = position.size || 0;
  const soldShares = Math.max(0, totalBought - size);
  const result = totalBought > 0 && (soldShares > 0 || position.redeemable);
  console.log('[Outcomes][shouldInclude]', {
    title: position.title,
    outcome: position.outcome,
    conditionId: position.conditionId,
    totalBought,
    size,
    soldShares,
    redeemable: position.redeemable,
    included: result,
  });
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
    return (positions || [])
      .filter(shouldInclude)
      .sort((a, b) => {
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

  console.log('[Outcomes][raw trades from API]', trades);

  const tradeOutcomes: AggregatedTradeOutcome[] = useMemo(() => {
    console.log('[Outcomes][tradeOutcomes] recomputing, trades.length=', trades.length);
    if (!trades.length) return [];

    type RawTrade = (typeof trades)[0];

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
      const sorted = [...groupTrades].sort((a, b) => a.timestamp - b.timestamp);

      // Step 3: detect per-cycle boundaries
      // A new cycle starts when a BUY arrives after the current accumulator already
      // has at least one SELL — i.e. the user is re-entering the same outcome.
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
        if (buyShares <= 0 || sellShares <= 0) return; // incomplete cycle, skip
        const avgBuyPrice = buyCost > 0 ? buyCost / buyShares : null;
        const avgSellPrice = sellProceeds > 0 ? sellProceeds / sellShares : null;
        const realizedPnl =
          avgBuyPrice != null && avgSellPrice != null
            ? (avgSellPrice - avgBuyPrice) * sellShares
            : 0;

        const result =
          avgSellPrice == null || avgBuyPrice == null
            ? 'UNKNOWN'
            : avgSellPrice > avgBuyPrice + 1e-6
              ? 'WIN'
              : avgSellPrice < avgBuyPrice - 1e-6
                ? 'LOSS'
                : 'BREAKEVEN';

        console.log(`[Outcomes][cycle] ${baseKey} #${cycleIndex + 1}`, {
          title,
          avgBuyPrice,
          avgSellPrice,
          realizedPnl,
          result,
        });

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
        buyShares = 0;
        buyCost = 0;
        sellShares = 0;
        sellProceeds = 0;
        hadSell = false;
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
  }, [trades]);

  // Keys already covered by the positions API — used to deduplicate trade outcomes.
  const positionKeys = useMemo(
    () => new Set(items.map((p) => `${p.conditionId}-${p.outcomeIndex}`)),
    [items],
  );

  // Only include trade outcomes that are NOT already shown via a position entry.
  // Fully-closed trades disappear from the positions API (size=0), so they land
  // here exclusively. Partially-sold positions appear in both — skip the duplicate.
  const supplementalTradeOutcomes = useMemo(
    () => tradeOutcomes.filter((t) => !positionKeys.has(t.key)),
    [tradeOutcomes, positionKeys],
  );

  console.log('[Outcomes][FINAL]', {
    allPositions: (positions || []).length,
    positionOutcomes: items.length,
    positionOutcomeItems: items.map((p) => ({ title: p.title, outcome: p.outcome, conditionId: p.conditionId, redeemable: p.redeemable, totalBought: p.totalBought, size: p.size, realizedPnl: p.realizedPnl, curPrice: p.curPrice })),
    tradeOutcomesTotal: tradeOutcomes.length,
    supplementalTradeOutcomes: supplementalTradeOutcomes.length,
    supplementalItems: supplementalTradeOutcomes.map((t) => ({ title: t.title, outcome: t.outcome, key: t.key, avgBuyPrice: t.avgBuyPrice, avgSellPrice: t.avgSellPrice, realizedPnl: t.realizedPnl })),
  });

  const hasPositionOutcomes = items.length > 0;
  const hasSupplementalTrades = supplementalTradeOutcomes.length > 0;

  if (!hasPositionOutcomes && !hasSupplementalTrades) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm">
          No completed outcomes yet. Sell shares or wait for a market to settle to see Win/Loss.
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
