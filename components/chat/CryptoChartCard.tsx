'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import { LineChart } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { MarketService } from '@/services/market-service';

export interface CoinGeckoChartIntent {
  coinId: string;
  symbol: string;
  name: string;
  query: string;
}

type CoinGeckoChartRange = '1D' | '7D' | '30D';

const COINGECKO_CHART_RANGES: CoinGeckoChartRange[] = ['1D', '7D', '30D'];

const RANGE_DAYS: Record<CoinGeckoChartRange, number> = {
  '1D': 1,
  '7D': 7,
  '30D': 30,
};

const COINGECKO_CHART_COINS: Record<
  string,
  { id: string; symbol: string; name: string }
> = {
  eth: { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  ethereum: { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  btc: { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  bitcoin: { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  sol: { id: 'solana', symbol: 'SOL', name: 'Solana' },
  solana: { id: 'solana', symbol: 'SOL', name: 'Solana' },
  matic: { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  polygon: { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  doge: { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  dogecoin: { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  xrp: { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  ripple: { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  ada: { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  cardano: { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  bnb: { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  link: { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  chainlink: { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  avax: { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  avalanche: { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  ltc: { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  litecoin: { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  dot: { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  polkadot: { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  uni: { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  uniswap: { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  arb: { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum' },
  arbitrum: { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum' },
  op: { id: 'optimism', symbol: 'OP', name: 'Optimism' },
  optimism: { id: 'optimism', symbol: 'OP', name: 'Optimism' },
  near: { id: 'near', symbol: 'NEAR', name: 'NEAR' },
  sui: { id: 'sui', symbol: 'SUI', name: 'Sui' },
  pepe: { id: 'pepe', symbol: 'PEPE', name: 'Pepe' },
  shib: { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
  usdc: { id: 'usd-coin', symbol: 'USDC', name: 'USDC' },
  usdt: { id: 'tether', symbol: 'USDT', name: 'Tether' },
  tether: { id: 'tether', symbol: 'USDT', name: 'Tether' },
};

const CHART_REQUEST_PATTERNS = [
  /^(?:please\s+)?(?:can\s+(?:you|we)\s+|could\s+you\s+)?(?:show|display|pull\s+up|bring\s+up|view|see|get|gimme|give\s+me)\s*(?:me\s+)?(?:the\s+)?([a-z0-9.-]{2,20})(?:\s+price)?\s+(?:chart|graph)\s*(?:please)?\??$/i,
  /^([a-z0-9.-]{2,20})(?:\s+price)?\s+(?:chart|graph)\s*(?:please)?\??$/i,
  /^(?:what(?:'s|\s+is)\s+)?(?:the\s+)?([a-z0-9.-]{2,20})\s+(?:price\s+)?chart\s+look(?:ing)?\s+like\??$/i,
];

/**
 * Match natural-language chart requests like "show me the eth chart".
 * Only resolves for coins in the CoinGecko map so phrases like
 * "show me the org chart" never trigger a card.
 */
export function parseCoinGeckoChartIntent(
  text: string
): CoinGeckoChartIntent | null {
  const normalized = text
    .replace(/^@astro[,:]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.startsWith('/')) return null;
  for (const pattern of CHART_REQUEST_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const coin = COINGECKO_CHART_COINS[match[1].toLowerCase()];
    if (coin) {
      return { coinId: coin.id, symbol: coin.symbol, name: coin.name, query: normalized };
    }
  }
  return null;
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return '--';
  const decimals = value >= 1000 ? 2 : value >= 1 ? 2 : 6;
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals > 2 ? 2 : decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatCompactUsd(value?: number) {
  if (!Number.isFinite(value as number) || !value) return '--';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value >= 0 ? '▲' : '▼'} ${Math.abs(value).toFixed(2)}%`;
}

function ChartPriceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="dm-mono rounded-[8px] border border-white/[0.15] bg-black px-2.5 py-1.5 text-[11px] font-bold text-[#eceef2]">
      <div className="text-[9px] uppercase tracking-[0.12em] text-[#5a5e69]">
        {new Date(point.timestamp).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
      {formatUsd(point.price)}
    </div>
  );
}

export function CryptoChartCard({ intent }: { intent: CoinGeckoChartIntent }) {
  const { accessToken } = useUser();
  const [activeRange, setActiveRange] = useState<CoinGeckoChartRange>('7D');

  const marketQuery = useQuery({
    queryKey: ['cryptoChartCard', 'market', intent.coinId],
    queryFn: () =>
      MarketService.getTokenMarketData(intent.coinId, accessToken || undefined),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: ['cryptoChartCard', 'history', intent.coinId, activeRange],
    queryFn: () =>
      MarketService.getHistoricalPrices(
        intent.coinId,
        RANGE_DAYS[activeRange],
        accessToken || undefined
      ),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const points = useMemo(
    () =>
      (historyQuery.data?.prices || []).map((p) => ({
        timestamp: p.timestamp,
        price: p.price,
      })),
    [historyQuery.data]
  );

  const rangeStats = useMemo(() => {
    if (points.length < 2) return null;
    const first = points[0].price;
    const last = points[points.length - 1].price;
    let high = -Infinity;
    let low = Infinity;
    for (const p of points) {
      if (p.price > high) high = p.price;
      if (p.price < low) low = p.price;
    }
    return { high, low, changePct: ((last - first) / first) * 100 };
  }, [points]);

  const market = marketQuery.data;
  const price = market?.currentPrice ?? points[points.length - 1]?.price;
  const change24h = market?.priceChangePercentage24h ?? 0;
  const rangeUp = (rangeStats?.changePct ?? 0) >= 0;
  const lineColor = rangeUp ? '#3fe08f' : '#ff5d63';
  const change24hTone =
    change24h < 0
      ? 'border-[#ff5d63]/40 bg-[#ff5d63]/10 text-[#ffb2b6]'
      : change24h > 0
      ? 'border-[#3fe08f]/40 bg-[#3fe08f]/10 text-[#9ef7c8]'
      : 'border-white/[0.07] bg-black/25 text-[#9396a0]';
  const gradientId = `cg-chart-fill-${intent.coinId}-${rangeUp ? 'up' : 'down'}`;

  return (
    <div className="dm-rise mb-2 flex justify-start">
      <div className="w-full min-w-0 max-w-[460px]">
        <div className="my-3 w-full min-w-0 max-w-full border-l-2 border-[#3fe08f] pl-3">
          <div className="dm-mono mb-2 flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
            <span className="min-w-0 truncate">chart · coingecko</span>
            <span className="shrink-0 tracking-[0.05em] text-[#5a5e69]">
              {activeRange} range
            </span>
          </div>
          <div className="overflow-hidden rounded-[16px] border border-white/[0.07] bg-gradient-to-b from-[#15171d] to-[#111318] text-xs text-[#eceef2] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] border border-[#3fe08f]/30 bg-black shadow-[inset_0_0_12px_rgba(63,224,143,0.12)]">
                  <LineChart className="h-3.5 w-3.5 text-[#3fe08f]" />
                </span>
                <div className="min-w-0">
                  <div className="dm-mono truncate text-[15px] font-black text-[#eceef2]">
                    {intent.name}{' '}
                    <span className="text-[#5a5e69]">{intent.symbol}</span>
                  </div>
                  <div className="dm-mono mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                    coingecko · usd · live
                  </div>
                </div>
              </div>
              <div className="dm-mono shrink-0 text-right">
                <div className="text-[14px] font-black text-[#eceef2]">
                  {price !== undefined ? formatUsd(price) : '--'}
                </div>
                <div
                  className={`mt-1 inline-block rounded-[6px] border px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] ${change24hTone}`}
                >
                  {formatPercent(change24h)} 24H
                </div>
              </div>
            </div>

            <div className="h-[210px] border-b border-white/[0.07] bg-[#090b0e]">
              {historyQuery.isLoading ? (
                <div className="dm-mono grid h-full place-items-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                  loading chart…
                </div>
              ) : historyQuery.isError || points.length < 2 ? (
                <div className="dm-mono grid h-full place-items-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff5d63]">
                  chart unavailable — try again
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={points}
                    margin={{ top: 12, right: 4, bottom: 8, left: 4 }}
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis
                      domain={['dataMin', 'dataMax']}
                      orientation="right"
                      width={58}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#5a5e69', fontSize: 10 }}
                      tickFormatter={(v: number) => formatCompactUsd(v)}
                    />
                    <Tooltip content={<ChartPriceTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={lineColor}
                      strokeWidth={1.5}
                      fill={`url(#${gradientId})`}
                      dot={false}
                      activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3">
              <div className="flex flex-wrap gap-1.5">
                {COINGECKO_CHART_RANGES.map((range) => (
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
              {rangeStats && (
                <div
                  className={`dm-mono text-[10px] font-bold tracking-[0.08em] ${
                    rangeUp ? 'text-[#9ef7c8]' : 'text-[#ffb2b6]'
                  }`}
                >
                  {formatPercent(rangeStats.changePct)} / {activeRange}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 px-3.5 pb-3.5 sm:grid-cols-4">
              <div className="rounded-[10px] border border-white/[0.07] bg-black px-2.5 py-2">
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                  range high
                </div>
                <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#9ef7c8]">
                  {rangeStats ? formatUsd(rangeStats.high) : '--'}
                </div>
              </div>
              <div className="rounded-[10px] border border-white/[0.07] bg-black px-2.5 py-2">
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                  range low
                </div>
                <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#ffb2b6]">
                  {rangeStats ? formatUsd(rangeStats.low) : '--'}
                </div>
              </div>
              <div className="rounded-[10px] border border-white/[0.07] bg-black px-2.5 py-2">
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                  mkt cap
                </div>
                <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#eceef2]">
                  {formatCompactUsd(market?.marketCap)}
                </div>
              </div>
              <div className="rounded-[10px] border border-white/[0.07] bg-black px-2.5 py-2">
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
                  24h vol
                </div>
                <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#eceef2]">
                  {formatCompactUsd(market?.totalVolume)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
