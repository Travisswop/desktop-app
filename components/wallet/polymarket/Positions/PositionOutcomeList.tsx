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

  // Show anything that has an actual realized exit (soldShares>0),
  // or anything that is settled (redeemable) so we can compare to resolution.
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

  const tradeOutcomes: AggregatedTradeOutcome[] = useMemo(() => {
    if (!trades.length) return [];

    type Agg = {
      title: string;
      outcome: string;
      icon?: string | null;
      buyShares: number;
      buyCost: number;
      sellShares: number;
      sellProceeds: number;
    };

    const map = new Map<string, Agg>();
    for (const t of trades) {
      const key = `${t.conditionId}-${t.outcomeIndex}`;
      const current = map.get(key) ?? {
        title: t.title,
        outcome: t.outcome,
        icon: t.icon,
        buyShares: 0,
        buyCost: 0,
        sellShares: 0,
        sellProceeds: 0,
      };

      if (t.side === 'BUY') {
        current.buyShares += Number(t.size || 0);
        current.buyCost += Number(t.size || 0) * Number(t.price || 0);
      } else {
        current.sellShares += Number(t.size || 0);
        current.sellProceeds += Number(t.size || 0) * Number(t.price || 0);
      }

      // Prefer latest non-empty metadata
      if (t.title) current.title = t.title;
      if (t.outcome) current.outcome = t.outcome;
      if (t.icon) current.icon = t.icon;

      map.set(key, current);
    }

    const out: AggregatedTradeOutcome[] = [];
    for (const [key, a] of map.entries()) {
      if (a.buyShares <= 0 || a.sellShares <= 0) continue; // completed outcomes need both buys and sells
      const avgBuyPrice = a.buyCost > 0 ? a.buyCost / a.buyShares : null;
      const avgSellPrice = a.sellProceeds > 0 ? a.sellProceeds / a.sellShares : null;
      const realizedPnl =
        avgBuyPrice != null && avgSellPrice != null
          ? (avgSellPrice - avgBuyPrice) * a.sellShares
          : 0;

      out.push({
        key,
        title: a.title,
        outcome: a.outcome,
        icon: a.icon,
        boughtShares: a.buyShares,
        soldShares: a.sellShares,
        avgBuyPrice,
        avgSellPrice,
        realizedPnl,
      });
    }

    return out;
  }, [trades]);

  // Prefer positions API (it includes settled resolution info); fall back to trade aggregation
  // so fully-closed trades still show up in Outcomes.
  const hasPositionOutcomes = items.length > 0;
  const hasTradeOutcomes = tradeOutcomes.length > 0;

  if (!hasPositionOutcomes && !hasTradeOutcomes) {
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
      {hasPositionOutcomes
        ? items.map((position) => (
          <PositionOutcomeCard
            key={`${position.conditionId}-${position.outcomeIndex}`}
            position={position}
            onRedeem={onRedeem}
            isRedeeming={redeemingAsset === position.asset}
            canRedeem={canRedeem}
          />
        ))
        : tradeOutcomes.map((item) => (
          <TradeOutcomeCard key={item.key} item={item} />
        ))}
    </div>
  );
}
