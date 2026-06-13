'use client';

/* eslint-disable @next/next/no-img-element -- Mixed external SVG/PNG market icons need native decode failure for fallback. */

import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Bitcoin,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  Cpu,
  Droplets,
  Factory,
  Flame,
  Gem,
  Globe2,
  Landmark,
  LineChart,
  type LucideIcon,
  Rocket,
  Star,
  Wheat,
  Zap,
} from 'lucide-react';

type MarketIconSize = 'sm' | 'md' | 'lg';

interface MarketIconTheme {
  bg: string;
  fg: string;
  border?: string;
}

interface MarketIconSpec {
  symbol: string;
  imageSrc?: string;
  glyph?: LucideIcon;
  theme: MarketIconTheme;
}

interface MarketIconProps {
  coin: string;
  favorite?: boolean;
  selected?: boolean;
  size?: MarketIconSize;
  className?: string;
}

const LOCAL_CRYPTO_ICONS = new Set([
  'AAVE',
  'BONK',
  'BRETT',
  'BTC',
  'CAKE',
  'DAI',
  'ETH',
  'FIL',
  'FTM',
  'GRT',
  'HNT',
  'JUP',
  'MATIC',
  'MEW',
  'POL',
  'PONKE',
  'PYTH',
  'SOL',
  'SUSHI',
  'SWOP',
  'UNI',
  'USDC',
  'USDT',
  'WBTC',
  'WETH',
  'WPOL',
  'XRP',
]);

const CRYPTO_LOGO_OVERRIDES: Record<string, string> = {
  KPEPE: 'https://cryptologos.cc/logos/pepe-pepe-logo.png',
  KSHIB: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png',
};

const BRAND_LOGO_OVERRIDES: Record<string, string> = {
  SNDK: 'https://www.google.com/s2/favicons?domain=sandisk.com&sz=64',
};

const BRAND_SLUGS: Record<string, string> = {
  AAPL: 'apple',
  AMD: 'amd',
  AMZN: 'amazon',
  ARM: 'arm',
  ASML: 'asml',
  AVGO: 'broadcom',
  BABA: 'alibabadotcom',
  COIN: 'coinbase',
  COST: 'costco',
  CRCL: 'circle',
  CRWV: 'coreweave',
  DELL: 'dell',
  DKNG: 'draftkings',
  EBAY: 'ebay',
  GME: 'gamestop',
  GOOGL: 'google',
  HIMS: 'hims',
  HOOD: 'robinhood',
  IBM: 'ibm',
  INTC: 'intel',
  LLY: 'eli-lilly',
  META: 'meta',
  MSFT: 'microsoft',
  NFLX: 'netflix',
  NOK: 'nokia',
  NVDA: 'nvidia',
  ORCL: 'oracle',
  PLTR: 'palantir',
  RKLB: 'rocket',
  RIVN: 'rivian',
  SOFTBANK: 'softbank',
  SPCX: 'spacex',
  SMSN: 'samsung',
  TSLA: 'tesla',
  TSM: 'tsmc',
  WDC: 'westerndigital',
};

const GLYPHS: Record<string, LucideIcon> = {
  ALUMINIUM: Factory,
  BRENTOIL: Droplets,
  CL: Droplets,
  COPPER: Zap,
  CORN: Wheat,
  DXY: BadgeDollarSign,
  EUR: CircleDollarSign,
  EWJ: Globe2,
  EWT: Globe2,
  EWY: Globe2,
  EWZ: Globe2,
  GBP: CircleDollarSign,
  GOLD: Gem,
  GOLDJM: Gem,
  H100: Cpu,
  IBOV: LineChart,
  JP225: LineChart,
  JPY: CircleDollarSign,
  KR200: LineChart,
  KRW: CircleDollarSign,
  MAG7: ChartNoAxesCombined,
  NATGAS: Flame,
  NIFTY: LineChart,
  PALLADIUM: Gem,
  PLATINUM: Gem,
  SEMIS: Cpu,
  SILVER: Gem,
  SILVERJM: Gem,
  SMALL2000: LineChart,
  SOY: Wheat,
  SP500: LineChart,
  USA100: LineChart,
  USA500: LineChart,
  US500: LineChart,
  USBOND: Landmark,
  USENERGY: Flame,
  USOIL: Droplets,
  USTECH: LineChart,
  VIX: LineChart,
  WHEAT: Wheat,
  XLE: Flame,
  XYZ100: ChartNoAxesCombined,
};

const THEMES: Record<string, MarketIconTheme> = {
  BTC: { bg: '#F7931A', fg: '#fff' },
  ETH: { bg: '#111827', fg: '#fff' },
  SOL: { bg: '#14F195', fg: '#07111f' },
  HYPE: { bg: '#10B981', fg: '#fff' },
  BRENTOIL: { bg: '#0f766e', fg: '#ecfeff' },
  CL: { bg: '#111827', fg: '#f8fafc' },
  GOLD: { bg: '#C5A028', fg: '#fff7d6' },
  PAXG: { bg: '#C5A028', fg: '#fff7d6' },
  SILVER: { bg: '#64748b', fg: '#f8fafc' },
  SPCX: { bg: '#111827', fg: '#f8fafc' },
  SP500: { bg: '#2563eb', fg: '#eff6ff' },
  XYZ100: { bg: '#111827', fg: '#f8fafc' },
};

const DEFAULT_THEME: MarketIconTheme = { bg: '#0a0a0c', fg: '#fff' };

const SIZE_CLASSES: Record<MarketIconSize, string> = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-[13px]',
  lg: 'w-10 h-10 text-[15px]',
};

const IMAGE_PADDING: Record<MarketIconSize, string> = {
  sm: 'p-[4px]',
  md: 'p-[5px]',
  lg: 'p-[6px]',
};

const GLYPH_CLASSES: Record<MarketIconSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-[18px] h-[18px]',
  lg: 'w-5 h-5',
};

function normalizeCoin(coin: string) {
  return (coin.split(':').pop() || coin).trim().toUpperCase();
}

function hyperliquidCoinIcon(symbol: string) {
  return `https://app.hyperliquid.xyz/coins/${symbol}.svg`;
}

function simpleIcon(slug: string) {
  return `https://cdn.simpleicons.org/${slug}/111827`;
}

function localCryptoIcon(symbol: string) {
  return `/assets/crypto-icons/${symbol}.png`;
}

export function resolvePerpsMarketIcon(coin: string): MarketIconSpec {
  const isBuilderMarket = coin.includes(':');
  const symbol = normalizeCoin(coin);
  const theme = THEMES[symbol] ?? DEFAULT_THEME;

  if (LOCAL_CRYPTO_ICONS.has(symbol)) {
    return {
      symbol,
      imageSrc: localCryptoIcon(symbol),
      theme,
    };
  }

  if (CRYPTO_LOGO_OVERRIDES[symbol]) {
    return {
      symbol,
      imageSrc: CRYPTO_LOGO_OVERRIDES[symbol],
      theme,
    };
  }

  if (BRAND_LOGO_OVERRIDES[symbol]) {
    return {
      symbol,
      imageSrc: BRAND_LOGO_OVERRIDES[symbol],
      glyph: Building2,
      theme,
    };
  }

  if (BRAND_SLUGS[symbol]) {
    return {
      symbol,
      imageSrc: simpleIcon(BRAND_SLUGS[symbol]),
      glyph: symbol === 'SPCX' ? Rocket : Building2,
      theme,
    };
  }

  if (isBuilderMarket) {
    return {
      symbol,
      glyph: GLYPHS[symbol] ?? Landmark,
      theme,
    };
  }

  return {
    symbol,
    imageSrc: hyperliquidCoinIcon(symbol),
    glyph: symbol === 'BTC' ? Bitcoin : undefined,
    theme,
  };
}

export function MarketIcon({
  coin,
  favorite = false,
  selected = false,
  size = 'md',
  className = '',
}: MarketIconProps) {
  const spec = useMemo(() => resolvePerpsMarketIcon(coin), [coin]);
  const [imageFailed, setImageFailed] = useState(false);
  const Glyph = spec.glyph;

  useEffect(() => {
    setImageFailed(false);
  }, [spec.imageSrc]);

  const showImage = Boolean(spec.imageSrc && !imageFailed);
  const fallbackLabel = spec.symbol.charAt(0) || '?';

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center overflow-hidden font-bold ring-1 ${
          selected ? 'ring-gray-900 ring-2' : 'ring-black/[0.06]'
        }`}
        style={{
          background: showImage ? '#fff' : spec.theme.bg,
          color: spec.theme.fg,
          borderColor: spec.theme.border,
        }}
      >
        {showImage ? (
          <img
            src={spec.imageSrc}
            alt=""
            aria-hidden="true"
            className={`h-full w-full object-contain ${IMAGE_PADDING[size]}`}
            onError={() => setImageFailed(true)}
          />
        ) : Glyph ? (
          <Glyph className={GLYPH_CLASSES[size]} strokeWidth={2.4} />
        ) : (
          fallbackLabel
        )}
      </div>
      {favorite && (
        <Star className="absolute -top-0.5 -right-0.5 h-3 w-3 fill-amber-400 text-amber-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]" />
      )}
    </div>
  );
}
