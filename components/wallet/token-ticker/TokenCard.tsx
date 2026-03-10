'use client';

// Runtime shape of data coming from MarketService (CoinGecko-format)
// + sparklineData added by TokenTicker's fetchTokenTickerData
export interface TickerToken {
  id?: string;
  symbol: string;
  name: string;
  image?: string;                      // CoinGecko image URL
  currentPrice?: number;               // price as number
  priceChangePercentage24h?: number;   // change % as number
  sparklineData?: number[];            // 1-day historical prices
}

interface TokenCardProps {
  token: TickerToken;
}

// Custom smooth sparkline — cubic bezier from raw number[]
function Sparkline({
  data,
  symbol,
}: {
  data: number[];
  symbol: string;
}) {
  if (!data || data.length < 2) {
    return <div className="w-full h-full bg-gray-50 rounded" />;
  }

  const W = 160;
  const H = 80;
  const pad = 6;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

  // Cubic bezier for smooth curves
  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

  const fillId = `tkfill-${symbol}`;
  const strokeId = `tkstroke-${symbol}`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        {/* Vertical fill: green → transparent */}
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
          <stop offset="75%" stopColor="#34d399" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        {/* Horizontal stroke: teal → indigo */}
        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="55%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TokenCard({ token }: TokenCardProps) {
  const isPositive = (token.priceChangePercentage24h ?? 0) >= 0;
  const change = Math.abs(token.priceChangePercentage24h ?? 0).toFixed(0);

  const formattedPrice =
    token.currentPrice != null
      ? token.currentPrice.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: token.currentPrice < 1 ? 4 : 2,
        })
      : '—';

  return (
    <div className="min-w-[160px] bg-white rounded-2xl border border-gray-100 shadow-sm flex-shrink-0 flex flex-col overflow-hidden">
      {/* ── Header: circle icon  +  name / price ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-1">
        {/* Circle icon */}
        <div className="w-11 h-11 flex-shrink-0 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {token.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.image}
              alt={token.name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              {token.symbol.slice(0, 3)}
            </span>
          )}
        </div>

        {/* Name + price stacked */}
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[15px] font-bold text-gray-900 truncate">
            {token.symbol.toUpperCase()}
          </span>
          <span className="text-[15px] font-bold text-gray-900">
            ${formattedPrice}
          </span>
        </div>
      </div>

      {/* ── Sparkline — full width ── */}
      <div className="w-full h-[80px] mt-1">
        <Sparkline data={token.sparklineData ?? []} symbol={token.symbol} />
      </div>

      {/* ── Change badge — bottom-right ── */}
      <div className="flex justify-end px-3 pb-3 pt-1">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            isPositive
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {isPositive ? '+ ' : '- '}
          {change}%
        </span>
      </div>
    </div>
  );
}
