'use client';

// Brand colors for common Aave reserve assets; unknown symbols get a
// deterministic pastel so rows stay visually distinct without remote images.
const BRAND_COLORS: Record<string, string> = {
  USDC: '#2775CA',
  USDT: '#26A17B',
  DAI: '#F5AC37',
  ETH: '#627EEA',
  WETH: '#627EEA',
  WSTETH: '#00A3FF',
  CBETH: '#0052FF',
  WBTC: '#F09242',
  CBBTC: '#0052FF',
  LINK: '#2A5ADA',
  ARB: '#28A0F0',
  AAVE: '#B6509E',
  WPOL: '#8247E5',
  WMATIC: '#8247E5',
  GHO: '#41B6AE',
  EURS: '#10316B',
};

const fallbackColor = (symbol: string) => {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 55%, 45%)`;
};

export function AaveTokenIcon({
  symbol,
  size = 34,
}: {
  symbol: string;
  size?: number;
}) {
  const color = BRAND_COLORS[symbol.toUpperCase()] || fallbackColor(symbol);
  const label = symbol.length > 5 ? symbol.slice(0, 4) : symbol;

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-mono font-semibold uppercase"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}1F`,
        color,
        fontSize: Math.max(8, Math.floor(size / 4)),
      }}
      aria-label={symbol}
    >
      {label}
    </div>
  );
}
