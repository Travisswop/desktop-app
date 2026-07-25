/**
 * Futures/outright market grouping + preview rows — shared between
 * SportsTableView.tsx (full "Sports markets" page) and BrowseMarketsBento.tsx
 * (homepage bento preview). Deliberately dependency-light (no useTrading /
 * provider imports) so either surface can pull it in without dragging along
 * the Privy/Coinbase wallet-provider chain.
 */

import Image from 'next/image';
import type { PolymarketMarket } from '@/hooks/polymarket';

const HAIR = 'rgba(0,0,0,0.06)';
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export interface FuturesMarketGroup {
  id: string;
  title: string;
  markets: PolymarketMarket[];
}

interface FuturesOutcomeRow {
  label: string;
  price: number;
  tokenId: string;
}

function parseJsonArray<T>(raw: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function getFuturesOutcomeRows(market: PolymarketMarket): FuturesOutcomeRow[] {
  const outcomes = parseJsonArray<string>(market.outcomes);
  const staticPrices = parseJsonArray<string | number>(
    market.outcomePrices,
  ).map(Number);
  const tokenIds = parseJsonArray<string>(market.clobTokenIds);

  return outcomes.map((label, index) => {
    const tokenId = tokenIds[index] ?? '';
    const realtime = tokenId ? market.realtimePrices?.[tokenId] : undefined;
    const price =
      realtime?.midPrice ??
      realtime?.askPrice ??
      realtime?.bidPrice ??
      staticPrices[index] ??
      0;
    return { label, price, tokenId };
  });
}

export function groupFuturesMarkets(
  markets: PolymarketMarket[],
): FuturesMarketGroup[] {
  const groups = new Map<string, FuturesMarketGroup>();

  for (const market of markets) {
    const title =
      (market.eventTitle as string | undefined) ||
      (market.events?.[0]?.title as string | undefined) ||
      'Futures';
    const id =
      (market.eventId as string | undefined) ||
      (market.eventSlug as string | undefined) ||
      title;
    if (!groups.has(id)) groups.set(id, { id, title, markets: [] });
    groups.get(id)!.markets.push(market);
  }

  return Array.from(groups.values());
}

function formatCents(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '--';
  return `${Math.round(price * 100)}¢`;
}

export function FuturesMarketGroupRows({
  group,
  firstGroup,
  disabled,
  onOutcomeClick,
}: {
  group: FuturesMarketGroup;
  firstGroup: boolean;
  disabled: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}) {
  return (
    <div style={firstGroup ? undefined : { borderTop: `1px solid ${HAIR}` }}>
      <div
        className="px-4 sm:px-[18px] py-2.5 flex items-center justify-between gap-3"
        style={{
          background: '#fafafa',
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div className="min-w-0">
          <div
            className="text-[10px] font-bold uppercase text-gray-500"
            style={{ fontFamily: MONO }}
          >
            Futures
          </div>
          <div className="text-[14px] sm:text-[15px] font-semibold text-gray-900 truncate">
            {group.title}
          </div>
        </div>
        <div
          className="text-[10.5px] font-semibold text-gray-500 shrink-0"
          style={{ fontFamily: MONO }}
        >
          {group.markets.length} markets
        </div>
      </div>

      {group.markets.map((market, marketIndex) => (
        <FuturesMarketRow
          key={market.id}
          market={market}
          firstRow={marketIndex === 0}
          disabled={disabled}
          onOutcomeClick={onOutcomeClick}
        />
      ))}
    </div>
  );
}

function FuturesMarketRow({
  market,
  firstRow,
  disabled,
  onOutcomeClick,
}: {
  market: PolymarketMarket;
  firstRow: boolean;
  disabled: boolean;
  onOutcomeClick: (
    market: PolymarketMarket,
    outcome: string,
    price: number,
    tokenId: string,
  ) => void;
}) {
  const outcomes = getFuturesOutcomeRows(market);
  const icon = market.icon || market.image || market.eventIcon;
  const isClosed = market.closed || market.active === false;

  return (
    <div
      className="px-4 sm:px-[18px] py-3.5 grid gap-3 sm:grid-cols-[1fr_minmax(260px,360px)] sm:items-center"
      style={firstRow ? undefined : { borderTop: `1px solid ${HAIR}` }}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <Image
            src={icon}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-lg object-cover bg-gray-50 shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[14px] sm:text-[15px] font-semibold text-gray-900 leading-snug">
            {market.question}
          </div>
          <div
            className="mt-1 text-[10.5px] text-gray-500 font-semibold"
            style={{ fontFamily: MONO }}
          >
            {market.eventTitle || 'NBA futures'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {outcomes.slice(0, 4).map((outcome, index) => {
          const isYes =
            outcome.label.toLowerCase() === 'yes' ||
            (outcomes.length === 2 && index === 0);
          return (
            <button
              key={outcome.tokenId || `${market.id}-${index}`}
              type="button"
              disabled={disabled || isClosed || !outcome.tokenId}
              onClick={() =>
                onOutcomeClick(
                  market,
                  outcome.label,
                  outcome.price,
                  outcome.tokenId,
                )
              }
              className={`min-h-12 rounded-[12px] border px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                disabled || isClosed || !outcome.tokenId
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : isYes
                    ? 'bg-emerald-50 text-gray-900 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-white text-gray-900 hover:bg-gray-50 cursor-pointer'
              }`}
              style={{
                borderColor: isYes ? 'rgba(25,169,116,0.38)' : HAIR,
              }}
            >
              <span className="font-semibold text-[13px] truncate">
                {outcome.label}
              </span>
              <span
                className={`font-bold text-[14px] tabular-nums ${
                  isYes ? 'text-emerald-600' : 'text-gray-700'
                }`}
                style={{ fontFamily: MONO }}
              >
                {formatCents(outcome.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
