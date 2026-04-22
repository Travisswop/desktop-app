'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Loader2,
  AlertTriangle,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useHyperliquidPositions } from './hooks/useHyperliquidPositions';
import { useHyperliquidMarkets } from './hooks/useHyperliquidMarkets';
import { useAllMids } from './hooks/useHyperliquidWebSocket';
import {
  formatPnl,
  formatPrice,
  getLiquidationRisk,
} from '@/services/hyperliquid/types';
import type { HLMarket, HLPosition } from '@/services/hyperliquid/types';
import { PerpsActionsModal, type PerpsActionTab } from './PerpsActionsModal';

interface PerpsCardProps {
  /** Privy embedded wallet address (set after agent is initialized) */
  masterAddress: string | undefined;
  /** True while silently reconnecting after a brief disconnect */
  isReconnecting?: boolean;
  /**
   * Open the full trading panel. The optional `coin` arg lets the panel land
   * on the market the user clicked (position row, market row) instead of the
   * default BTC.
   */
  onOpenTrading: (coin?: string) => void;
  /** Optional: hand off the user to the Arbitrum bridge flow. */
  onBridgeToArbitrum?: () => void;
  /** Optional: called after a deposit tx is submitted — used by the parent to
   *  start polling the Hyperliquid balance for agent-approval readiness. */
  onDepositSubmitted?: () => void;
}

const MAX_POSITIONS = 3;
const MAX_MARKETS = 4;

/**
 * PerpsCard
 *
 * Dashboard card showing Hyperliquid account state:
 *  - Balance + deposit/withdraw actions in the header
 *  - Up to 3 open positions with live mark prices and PnL
 *  - Top markets sorted by 24h volume
 */
export function PerpsCard({
  masterAddress,
  isReconnecting = false,
  onOpenTrading,
  onBridgeToArbitrum,
  onDepositSubmitted,
}: PerpsCardProps) {
  const { data, isLoading } = useHyperliquidPositions(masterAddress ?? null);
  const { data: markets } = useHyperliquidMarkets();
  const { mids } = useAllMids(!!masterAddress);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsTab, setActionsTab] = useState<PerpsActionTab>('deposit');

  const accountValue = parseFloat(data?.accountValue ?? '0');
  const positions = data?.positions ?? [];
  const hasPositions = positions.length > 0;
  const hasDanger = positions.some((p) => getLiquidationRisk(p) === 'danger');

  const topMarkets = useMemo(() => topMarketsByVolume(markets, MAX_MARKETS), [
    markets,
  ]);

  const openActions = (tab: PerpsActionTab) => {
    setActionsTab(tab);
    setActionsOpen(true);
  };

  return (
    <>
      <div
        className={`bg-white rounded-2xl p-5 flex flex-col min-h-[380px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-all ${
          hasDanger ? 'ring-2 ring-red-200 ring-offset-1' : ''
        }`}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-400">
              Perps Balance
            </span>
            {isLoading || isReconnecting ? (
              <div className="h-9 w-40 bg-gray-100 rounded-lg animate-pulse" />
            ) : masterAddress ? (
              <p className="text-3xl font-bold text-gray-900 tabular-nums leading-tight">
                ${formatBalance(accountValue)}
              </p>
            ) : (
              <p className="text-3xl font-bold text-gray-300 tabular-nums leading-tight">
                $0.00
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ActionIconButton
              label="Deposit or Withdraw"
              onClick={() => openActions('deposit')}
              disabled={!masterAddress}
            >
              <ArrowUpDown className="w-4 h-4" />
            </ActionIconButton>
          </div>
        </div>

        {hasDanger && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full font-medium self-start mb-2">
            <AlertTriangle className="w-3 h-3" />
            Liquidation risk
          </div>
        )}

        {isReconnecting && (
          <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg mt-1 mb-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Reconnecting wallet…
          </div>
        )}

        {/* ── Positions ───────────────────────────────────────────── */}
        <section className="mt-4">
          <SectionHeader title="Positions" />
          <div className="mt-2">
            {!masterAddress ? (
              <EmptyHint
                text="Set up perps trading to open positions."
                cta="Enable Trading"
                // Wrap so EmptyHint's <button onClick={onClick}> doesn't
                // forward a MouseEvent as the coin arg.
                onClick={() => onOpenTrading()}
              />
            ) : isLoading ? (
              <PositionsSkeleton />
            ) : hasPositions ? (
              <ul className="space-y-3">
                {positions.slice(0, MAX_POSITIONS).map((pos) => (
                  <li key={pos.coin}>
                    <PositionRow
                      position={pos}
                      livePrice={mids[pos.coin]}
                      // Wrap so the panel lands on the clicked position's coin
                      // (otherwise React would forward the MouseEvent as the arg
                      // and the panel would default to BTC).
                      onClick={() => onOpenTrading(pos.coin)}
                    />
                  </li>
                ))}
                {positions.length > MAX_POSITIONS && (
                  <li>
                    <button
                      onClick={() => onOpenTrading()}
                      className="w-full text-xs text-gray-400 hover:text-gray-700 text-center py-1.5 transition-colors"
                    >
                      +{positions.length - MAX_POSITIONS} more →
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <EmptyHint
                text={
                  accountValue > 0
                    ? 'No open positions yet.'
                    : 'Deposit USDC to start trading.'
                }
                cta={accountValue > 0 ? 'Trade →' : 'Deposit USDC'}
                onClick={
                  accountValue > 0
                    ? () => onOpenTrading()
                    : () => openActions('deposit')
                }
              />
            )}
          </div>
        </section>

        {/* ── Markets ─────────────────────────────────────────────── */}
        <section className="mt-5">
          <SectionHeader title="Markets" />
          <div className="mt-2">
            {topMarkets.length === 0 ? (
              <MarketsSkeleton />
            ) : (
              <ul className="space-y-3">
                {topMarkets.map((m) => (
                  <li key={m.coin}>
                    <MarketRow
                      market={m}
                      // Wrap so the panel lands on this market's coin instead
                      // of receiving the MouseEvent and defaulting to BTC.
                      onClick={() => onOpenTrading(m.coin)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <PerpsActionsModal
        isOpen={actionsOpen}
        initialTab={actionsTab}
        onClose={() => setActionsOpen(false)}
        masterAddress={masterAddress ?? null}
        onBridgeToArbitrum={onBridgeToArbitrum}
        onDepositSubmitted={onDepositSubmitted}
      />
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-sm font-medium text-gray-400 tracking-wide">
      {title}
    </h3>
  );
}

function ActionIconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function PositionRow({
  position,
  livePrice,
  onClick,
}: {
  position: HLPosition;
  livePrice?: string;
  onClick: () => void;
}) {
  const isLong = parseFloat(position.szi) > 0;
  const pnl = formatPnl(position.unrealizedPnl);
  const positionValue = parseFloat(position.positionValue || '0');
  const liquidationPx = position.liquidationPx
    ? formatPrice(position.liquidationPx)
    : null;
  const risk = getLiquidationRisk(position);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-1 group text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <CoinAvatar coin={position.coin} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold text-gray-900">
              {position.coin}
            </span>
            <LeverageBadge
              leverage={position.leverage.value}
              isLong={isLong}
            />
            {risk !== 'safe' && (
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  risk === 'danger'
                    ? 'text-red-500 animate-pulse'
                    : 'text-amber-500'
                }`}
              />
            )}
          </div>
          {liquidationPx && (
            <p className="text-xs text-gray-400 mt-0.5">
              Liquidation at {liquidationPx}
            </p>
          )}
          {!liquidationPx && livePrice && (
            <p className="text-xs text-gray-400 mt-0.5">
              Mark ${formatPrice(livePrice)}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-base font-bold text-gray-900 tabular-nums">
          ${positionValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span
          className={`text-xs font-semibold tabular-nums flex items-center gap-0.5 ${
            pnl.isPositive ? 'text-emerald-500' : 'text-red-500'
          }`}
        >
          {pnl.isPositive ? '▲' : '▼'} {pnl.value.replace('+', '').replace('-', '')}
        </span>
      </div>
    </button>
  );
}

function MarketRow({
  market,
  onClick,
}: {
  market: HLMarket;
  onClick: () => void;
}) {
  const price = parseFloat(market.markPrice || '0');
  const isPositive = market.change24h >= 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-1 group text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <CoinAvatar coin={market.coin} size={26} />
        <span className="text-sm font-semibold text-gray-900 truncate">
          {coinDisplayName(market.coin)}
        </span>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          ${formatPrice(price)}
        </span>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 tabular-nums ${
            isPositive
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}
          {market.change24h.toFixed(2)}%
        </span>
      </div>
    </button>
  );
}

function LeverageBadge({
  leverage,
  isLong,
}: {
  leverage: number;
  isLong: boolean;
}) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${
        isLong
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-red-50 text-red-500'
      }`}
    >
      {leverage}x {isLong ? 'LONG' : 'SHORT'}
    </span>
  );
}

function CoinAvatar({ coin, size = 32 }: { coin: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const sources = useMemo(() => coinIconSources(coin), [coin]);
  const [srcIndex, setSrcIndex] = useState(0);

  const { bg, fg } = coinColors(coin);
  const fontSize = Math.max(10, Math.round(size * 0.42));

  if (!errored && srcIndex < sources.length) {
    return (
      // Native <img> avoids next/image domain config + lets us cycle through
      // multiple CDN fallbacks before degrading to the letter avatar.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sources[srcIndex]}
        alt={coin}
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full flex-shrink-0 bg-gray-50 object-cover"
        style={{ width: size, height: size }}
        onError={() => {
          if (srcIndex + 1 < sources.length) {
            setSrcIndex(srcIndex + 1);
          } else {
            setErrored(true);
          }
        }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize,
      }}
    >
      {coin.slice(0, 1)}
    </div>
  );
}

function EmptyHint({
  text,
  cta,
  onClick,
}: {
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-gray-400">
          <TrendingUp className="w-3.5 h-3.5" />
        </div>
        {text}
      </div>
      <button
        onClick={onClick}
        className="text-xs font-semibold text-gray-700 hover:text-gray-900 inline-flex items-center gap-1"
      >
        <Zap className="w-3 h-3" />
        {cta}
      </button>
    </div>
  );
}

function PositionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 1 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-2.5 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-2.5 w-12 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="ml-auto h-3 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBalance(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function topMarketsByVolume(
  markets: HLMarket[] | undefined,
  count: number,
): HLMarket[] {
  if (!markets) return [];
  return [...markets]
    .sort((a, b) => parseFloat(b.dayVolume) - parseFloat(a.dayVolume))
    .slice(0, count);
}

function coinDisplayName(coin: string): string {
  const aliases: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    HYPE: 'Hyperliquid',
    DOGE: 'Dogecoin',
    XRP: 'XRP',
    AVAX: 'Avalanche',
    SUI: 'Sui',
    MATIC: 'Polygon',
    BNB: 'BNB',
    ARB: 'Arbitrum',
    OP: 'Optimism',
  };
  return aliases[coin] ?? coin.charAt(0) + coin.slice(1).toLowerCase();
}

/**
 * Returns an ordered list of CDN URLs to try for a coin icon.
 *
 * Hyperliquid's own coin SVGs are served from app.hyperliquid.xyz/coins/<COIN>.svg
 * and cover every listed perp. spothq's cryptocurrency-icons GitHub repo is the
 * fallback for common coins. The component cycles through each URL on <img>
 * error before degrading to the colored letter avatar.
 */
function coinIconSources(coin: string): string[] {
  const upper = coin.toUpperCase();
  const lower = coin.toLowerCase();
  return [
    `https://app.hyperliquid.xyz/coins/${upper}.svg`,
    `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${lower}.svg`,
  ];
}

function coinColors(coin: string): { bg: string; fg: string } {
  const map: Record<string, { bg: string; fg: string }> = {
    BTC: { bg: '#F7931A', fg: '#FFFFFF' },
    ETH: { bg: '#3B82F6', fg: '#FFFFFF' },
    SOL: { bg: '#14F195', fg: '#0F172A' },
    HYPE: { bg: '#10B981', fg: '#FFFFFF' },
    DOGE: { bg: '#C2A633', fg: '#FFFFFF' },
    XRP: { bg: '#23292F', fg: '#FFFFFF' },
    AVAX: { bg: '#E84142', fg: '#FFFFFF' },
    SUI: { bg: '#4DA2FF', fg: '#FFFFFF' },
    MATIC: { bg: '#8247E5', fg: '#FFFFFF' },
    BNB: { bg: '#F3BA2F', fg: '#0F172A' },
    ARB: { bg: '#28A0F0', fg: '#FFFFFF' },
    OP: { bg: '#FF0420', fg: '#FFFFFF' },
    USDC: { bg: '#2775CA', fg: '#FFFFFF' },
    USDT: { bg: '#26A17B', fg: '#FFFFFF' },
  };
  if (map[coin]) return map[coin];

  // Deterministic fallback color from the coin name.
  const hue =
    [...coin].reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 360, 0);
  return { bg: `hsl(${hue} 70% 55%)`, fg: '#FFFFFF' };
}
