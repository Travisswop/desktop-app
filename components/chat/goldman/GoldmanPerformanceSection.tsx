'use client';

// Per-strategy performance section for the Goldman Sacks console panel.
// Renders realized PnL, win rate, trade count, fees, a compact 14-day daily
// PnL bar chart (recharts, already a repo dependency via CryptoChartCard),
// and per-venue breakdown chips. Hidden entirely while the backend PnL
// ledger has not shipped (performance == null on every strategy).

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  formatCompactUsd,
  formatSignedUsd,
  toFiniteNumber,
} from '@/lib/chat/ticketFormat';
import { GoldmanConsoleCard, GoldmanSectionLabel } from './consoleUi';
import type {
  GoldmanDailyPnlDay,
  GoldmanTradingStrategy,
} from './goldmanTypes';

type DailyPnlPoint = {
  day: string;
  realizedUsd: number;
  feesUsd: number;
};

function toDailyPoints(days?: GoldmanDailyPnlDay[] | null): DailyPnlPoint[] {
  if (!Array.isArray(days)) return [];
  return days
    .filter((entry) => Boolean(entry?.day))
    .map((entry) => ({
      day: String(entry.day),
      realizedUsd: toFiniteNumber(entry.realizedUsd),
      feesUsd: toFiniteNumber(entry.feesUsd),
    }));
}

function venueTotals(days?: GoldmanDailyPnlDay[] | null) {
  const totals = new Map<string, number>();
  for (const entry of days || []) {
    const byVenue = entry?.byVenue;
    if (!byVenue || typeof byVenue !== 'object') continue;
    for (const [venue, value] of Object.entries(byVenue)) {
      const amount = toFiniteNumber(value);
      if (!venue) continue;
      totals.set(venue, (totals.get(venue) || 0) + amount);
    }
  }
  return Array.from(totals.entries()).map(([venue, realizedUsd]) => ({
    venue,
    realizedUsd,
  }));
}

function formatChartDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return day;
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function DailyPnlTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DailyPnlPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="dm-mono rounded-[8px] border border-white/[0.1] bg-[#0b0d11] px-2.5 py-1.5 text-[10px] font-semibold text-[#eceef2] shadow-xl">
      <div className="text-[#9396a0]">{formatChartDay(point.day)}</div>
      <div
        className={point.realizedUsd >= 0 ? 'text-[#3fe08f]' : 'text-[#ff8585]'}
      >
        {formatSignedUsd(point.realizedUsd)}
      </div>
      {point.feesUsd > 0 && (
        <div className="text-[#737783]">fees {formatCompactUsd(point.feesUsd)}</div>
      )}
    </div>
  );
}

function StrategyPerformanceCard({
  strategy,
}: {
  strategy: GoldmanTradingStrategy;
}) {
  const performance = strategy.performance;
  const dailyPoints = useMemo(
    () => toDailyPoints(strategy.dailyPnl),
    [strategy.dailyPnl]
  );
  const venues = useMemo(
    () => venueTotals(strategy.dailyPnl),
    [strategy.dailyPnl]
  );

  if (!performance) return null;

  const realizedPnl = toFiniteNumber(performance.realizedPnlUsd);
  const feesUsd = toFiniteNumber(performance.feesUsd);
  const tradeCount = toFiniteNumber(performance.tradeCount);
  const winCount = toFiniteNumber(performance.winCount);
  const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : null;

  const pnlClass = realizedPnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff8585]';

  return (
    <GoldmanConsoleCard padClass="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold text-[#eceef2]">
            {strategy.title || 'Strategy'}
          </div>
          <div className="dm-mono mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#5a5e69]">
            realized pnl
          </div>
        </div>
        <div className={`dm-mono text-right text-[18px] font-bold leading-none ${pnlClass}`}>
          {formatSignedUsd(realizedPnl)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-[8px] border border-white/[0.06] bg-black/20 px-2 py-1.5">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#737783]">
            win rate
          </div>
          <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
            {winRate === null ? '--' : `${winRate.toFixed(0)}%`}
          </div>
        </div>
        <div className="rounded-[8px] border border-white/[0.06] bg-black/20 px-2 py-1.5">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#737783]">
            trades
          </div>
          <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
            {tradeCount}
          </div>
        </div>
        <div className="rounded-[8px] border border-white/[0.06] bg-black/20 px-2 py-1.5">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#737783]">
            fees
          </div>
          <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
            {formatCompactUsd(feesUsd)}
          </div>
        </div>
      </div>

      {dailyPoints.length > 0 && (
        <div className="mt-3">
          <div className="dm-mono mb-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#737783]">
            daily pnl · last {dailyPoints.length}d
          </div>
          <div className="h-[64px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyPoints}
                margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
              >
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<DailyPnlTooltip />}
                />
                <Bar dataKey="realizedUsd" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {dailyPoints.map((point) => (
                    <Cell
                      key={point.day}
                      fill={point.realizedUsd >= 0 ? '#3fe08f' : '#ff5d63'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {venues.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {venues.map((item) => (
            <span
              key={item.venue}
              className={`dm-mono rounded-[7px] border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
                item.realizedUsd >= 0
                  ? 'border-[#3fe08f]/20 bg-[#3fe08f]/10 text-[#9af7c4]'
                  : 'border-[#ff5d63]/25 bg-[#ff5d63]/10 text-[#ff8585]'
              }`}
            >
              {item.venue} {formatSignedUsd(item.realizedUsd)}
            </span>
          ))}
        </div>
      )}
    </GoldmanConsoleCard>
  );
}

export function GoldmanPerformanceSection({
  strategies,
}: {
  strategies?: GoldmanTradingStrategy[] | null;
}) {
  const strategiesWithPerformance = useMemo(
    () =>
      (strategies || []).filter((strategy) =>
        Boolean(strategy?.performance)
      ),
    [strategies]
  );

  if (strategiesWithPerformance.length === 0) return null;

  return (
    <div data-testid="goldman-performance-section">
      <GoldmanSectionLabel>performance</GoldmanSectionLabel>
      {strategiesWithPerformance.map((strategy, index) => (
        <StrategyPerformanceCard
          key={strategy.id || strategy._id || `strategy-${index}`}
          strategy={strategy}
        />
      ))}
    </div>
  );
}
