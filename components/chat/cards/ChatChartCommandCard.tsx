'use client';

// Inline /chart command card for the Astro chat: renders a Hyperliquid
// candle chart with range controls for a requested perps market.
// Extracted from ChatArea.tsx.

import { useEffect, useState } from 'react';
import { BarChart3, Radio } from 'lucide-react';
import { CandleChart } from '@/components/wallet/perps/CandleChart';
import type { HLMarket } from '@/services/hyperliquid/types';
import { AgentMarketBlock } from '@/components/chat/cards/PolymarketCards';
import {
  displayPerpsCoin,
  formatPerpsPrice,
  getPerpsMarkPrice,
  perpsMarketForCoin,
  toFiniteNumber,
} from '@/lib/chat/ticketFormat';
import { AGENT_PANEL_CLASS } from '@/lib/chat/ticketStyles';
import type {
  ChartCommandIntent,
  ChartTimeRange,
} from '@/lib/chat/agentCardTypes';

const CHART_COMMAND_RANGES: ChartTimeRange[] = ['1D', '1W', '1M', '1Y', 'ALL'];

const CHART_COMMAND_EXAMPLES = ['/chart BTC', '/chart ETH 1W', '/chart SOL 1M'];

function getChartRangeInterval(range: ChartTimeRange) {
  const intervalByRange: Record<ChartTimeRange, string> = {
    '1D': '15m',
    '1W': '1h',
    '1M': '4h',
    '1Y': '1d',
    ALL: '1w',
  };
  return intervalByRange[range];
}

function getChartRangeHistoryBars(range: ChartTimeRange) {
  const barsByRange: Record<ChartTimeRange, number> = {
    '1D': 110,
    '1W': 185,
    '1M': 200,
    '1Y': 390,
    ALL: 520,
  };
  return barsByRange[range];
}

export function ChatChartCommandCard({
  intent,
  markets,
}: {
  intent: ChartCommandIntent;
  markets: HLMarket[];
}) {
  const [activeRange, setActiveRange] = useState<ChartTimeRange>(intent.range);

  useEffect(() => {
    setActiveRange(intent.range);
  }, [intent.range, intent.coin, intent.query]);

  const market = intent.coin
    ? perpsMarketForCoin(markets, intent.coin) || intent.market || null
    : null;
  const displayCoin =
    market?.displayCoin ||
    intent.displayCoin ||
    (intent.coin ? displayPerpsCoin(intent.coin) : '');
  const markPrice =
    intent.coin && !intent.empty && !intent.unsupported
      ? getPerpsMarkPrice(intent.coin, market || undefined)
      : 0;
  const change24h = toFiniteNumber(market?.change24h);
  const changeTone =
    change24h < 0 ? 'text-[#ff5d63]' : change24h > 0 ? 'text-[#3fe08f]' : 'text-[#9396a0]';
  const chartInterval = getChartRangeInterval(activeRange);
  const chartHistoryBars = getChartRangeHistoryBars(activeRange);
  const meta = intent.empty
    ? 'needs symbol'
    : intent.unsupported
    ? 'market not found'
    : `${activeRange} range`;

  return (
    <div className="dm-rise mb-2 flex justify-start">
      <div className="w-full min-w-0 max-w-[460px]">
        <AgentMarketBlock label="chart · hyperliquid" meta={meta}>
          <div className={`${AGENT_PANEL_CLASS} overflow-hidden text-xs`}>
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-3.5 py-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] bg-[#3fe08f]/15">
                    <BarChart3 className="h-3.5 w-3.5 text-[#3fe08f]" />
                  </span>
                  <div className="min-w-0">
                    <div className="dm-mono truncate text-[15px] font-black text-[#eceef2]">
                      {displayCoin ? `${displayCoin}-PERP` : 'Market chart'}
                    </div>
                    <div className="dm-mono mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                      {intent.query || 'type a symbol after /chart'}
                    </div>
                  </div>
                </div>
              </div>
              {!intent.empty && !intent.unsupported && (
                <div className="dm-mono shrink-0 text-right">
                  <div className="text-[14px] font-black text-[#eceef2]">
                    ${formatPerpsPrice(markPrice)}
                  </div>
                  <div className={`mt-1 text-[10px] font-bold ${changeTone}`}>
                    {formatChartChange(change24h)} 24h
                  </div>
                </div>
              )}
            </div>

            {intent.empty || intent.unsupported ? (
              <div className="grid gap-3 px-3.5 py-3">
                <div className="rounded-[12px] border border-white/[0.07] bg-black/25 px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-[#a9adb8]">
                  {intent.unsupported
                    ? `No Hyperliquid chart found for "${intent.query}".`
                    : 'Add a market after /chart.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CHART_COMMAND_EXAMPLES.map((example) => (
                    <span
                      key={example}
                      className="dm-mono rounded-[8px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#9ef7c8]"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="h-[230px] border-b border-white/[0.07] bg-[#090b0e]">
                  <CandleChart
                    coin={intent.coin}
                    interval={chartInterval}
                    height={230}
                    theme="dark"
                    historyBars={chartHistoryBars}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {CHART_COMMAND_RANGES.map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setActiveRange(range)}
                        className={`dm-btn rounded-[8px] border px-2.5 py-1.5 text-[10px] font-bold ${
                          activeRange === range
                            ? 'border-[#3fe08f]/40 bg-[#3fe08f]/14 text-[#3fe08f]'
                            : 'border-white/[0.07] bg-black/25 text-[#737783] hover:text-[#eceef2]'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  <div className="dm-mono flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                    <Radio className="h-3 w-3 text-[#3fe08f]" />
                    {chartInterval} candles
                  </div>
                </div>
              </>
            )}
          </div>
        </AgentMarketBlock>
      </div>
    </div>
  );
}

function formatChartChange(value: number) {
  if (!Number.isFinite(value) || value === 0) return '0.00%';
  const precision = Math.abs(value) >= 10 ? 1 : 2;
  return `${value > 0 ? '+' : ''}${value.toFixed(precision)}%`;
}
