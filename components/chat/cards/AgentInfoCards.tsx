'use client';

// Read-only agent display cards for the Astro chat: sports research briefs,
// research sources, loading placeholder, wallet receive QR, and marketplace
// item previews. Extracted from ChatArea.tsx.

import { useMemo, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  PieChart,
  QrCode,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  formatCompactUsd,
  formatWalletAddress,
  toFiniteNumber,
} from '@/lib/chat/ticketFormat';
import { AGENT_PANEL_CLASS, TICKET_LABEL_CLASS } from '@/lib/chat/ticketStyles';
import type {
  AstroConsoleData,
  MarketplaceItemPreview,
  ResearchSourcePreview,
  SportsResearchBrief,
  WalletPortfolioSnapshot,
  WalletReceiveQrDetails,
} from '@/lib/chat/agentCardTypes';
import type { TokenData } from '@/types/token';

function getResearchSourceHost(source: ResearchSourcePreview) {
  if (source.sourceName) return source.sourceName;
  if (!source.url) return 'source';
  try {
    return new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

function getResearchCheckedLabel(checkedAt?: string | null) {
  return checkedAt
    ? new Date(checkedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
}

export function SportsResearchBriefCard({
  research,
}: {
  research: SportsResearchBrief;
}) {
  const checkedLabel = getResearchCheckedLabel(research.checkedAt);
  const groups = (research.groups || []).filter((group) => group.items?.length);

  return (
    <div className={`mt-2 w-full overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] bg-[#3fe08f]/15">
              <BarChart3 className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">{research.title || 'sports research'}</span>
          </div>
          {(research.subtitle || research.sourceName) && (
            <div className="dm-mono mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[#6d717d]">
              {[research.sourceName, research.subtitle].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        {checkedLabel && (
          <span className="dm-mono rounded-[6px] bg-[#3fe08f]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ef7c8]">
            {checkedLabel}
          </span>
        )}
      </div>

      <div className="grid gap-3 px-3.5 py-3">
        {groups.slice(0, 6).map((group, groupIndex) => (
          <div
            key={`${group.title || 'group'}-${groupIndex}`}
            className="rounded-[12px] border border-white/[0.07] bg-black/20"
          >
            {group.title && (
              <div className="border-b border-white/[0.06] px-3 py-2">
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
                  {group.title}
                </div>
              </div>
            )}
            <div className="divide-y divide-white/[0.06]">
              {(group.items || []).slice(0, 8).map((item, itemIndex) => (
                <div
                  key={`${item.label || 'item'}-${itemIndex}`}
                  className="grid gap-1 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-[13px] font-semibold leading-snug text-[#eceef2]">
                      {item.label || 'Item'}
                    </span>
                    {(item.value || item.status) && (
                      <span className="shrink-0 text-right text-[13px] font-bold text-[#74f5ad]">
                        {item.value || item.status}
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-[12px] leading-relaxed text-[#a5a8b2]">
                      {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {research.notes?.length ? (
          <div className="dm-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6d717d]">
            {research.notes.slice(0, 2).join(' · ')}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SportsResearchSourceCards({
  sources,
  checkedAt,
}: {
  sources: ResearchSourcePreview[];
  checkedAt?: string | null;
}) {
  const checkedLabel = getResearchCheckedLabel(checkedAt);

  return (
    <div className={`mt-2 w-full overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] bg-[#3fe08f]/15">
              <BarChart3 className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">sports research</span>
          </div>
        </div>
        {checkedLabel && (
          <span className="dm-mono rounded-[6px] bg-[#3fe08f]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ef7c8]">
            {checkedLabel}
          </span>
        )}
      </div>

      <div className="grid gap-2 px-3.5 py-3">
        {sources.slice(0, 5).map((source, index) => {
          const host = getResearchSourceHost(source);

          return (
            <div
              key={`${source.title || host}-${index}`}
              className="rounded-[12px] border border-white/[0.07] bg-black/20 p-3"
            >
              <div className="dm-mono mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#3fe08f]">
                {host}
              </div>
              <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#eceef2]">
                {source.title || host}
              </div>
              {source.snippet && (
                <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-[#a5a8b2]">
                  {source.snippet}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentLoadingCard({ label }: { label: string }) {
  return (
    <div className={`mt-2 w-full overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center gap-2 px-3.5 py-3 text-[13px] font-semibold text-[#eceef2]">
        <Loader2 className="h-4 w-4 animate-spin text-[#3fe08f]" />
        {label}
      </div>
    </div>
  );
}

const PORTFOLIO_SEGMENT_COLORS = [
  '#3fe08f',
  '#62a8ff',
  '#f4c95d',
  '#ff7a7f',
  '#b78cff',
  '#7de2ff',
];
const EMPTY_PORTFOLIO_TOKENS: TokenData[] = [];

type PortfolioHolding = {
  key: string;
  symbol: string;
  chain: string;
  amount: number;
  value: number;
  percent: number;
  color: string;
};

function getTokenUsdValue(token: TokenData) {
  const explicitValue = toFiniteNumber(token.value);
  if (explicitValue > 0) return explicitValue;

  const balance = toFiniteNumber(token.balance);
  const price = toFiniteNumber(token.marketData?.price || token.nativeTokenPrice);
  return balance > 0 && price > 0 ? balance * price : 0;
}

function formatPortfolioAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 0 : value >= 10 ? 2 : 5,
  }).format(value);
}

function formatPortfolioPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)}%`;
}

function normalizePortfolioChain(chain?: string | null) {
  return String(chain || 'wallet')
    .replace(/_/g, ' ')
    .toLowerCase();
}

function buildPortfolioHoldings(tokens: TokenData[], totalValue: number) {
  return tokens
    .map((token, index) => {
      const value = getTokenUsdValue(token);
      const amount = toFiniteNumber(token.balance);
      const symbol = String(token.symbol || 'TOKEN').toUpperCase();
      return {
        key: `${symbol}-${token.chain || 'chain'}-${token.address || 'native'}-${token.walletAddress || index}`,
        symbol,
        chain: normalizePortfolioChain(token.chain),
        amount,
        value,
        percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: PORTFOLIO_SEGMENT_COLORS[index % PORTFOLIO_SEGMENT_COLORS.length],
      };
    })
    .filter((holding) => holding.value > 0 || holding.amount > 0)
    .sort((a, b) => b.value - a.value);
}

function buildConicGradient(holdings: PortfolioHolding[]) {
  const visible = holdings.filter((holding) => holding.percent > 0);
  if (!visible.length) return 'conic-gradient(#252a32 0deg 360deg)';

  let cursor = 0;
  const stops = visible.map((holding) => {
    const start = cursor;
    const end = Math.min(360, cursor + (holding.percent / 100) * 360);
    cursor = end;
    return `${holding.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  });

  if (cursor < 360) {
    stops.push(`#252a32 ${cursor.toFixed(2)}deg 360deg`);
  }

  return `conic-gradient(${stops.join(', ')})`;
}

function getPortfolioCheckedLabel(checkedAt?: string | null) {
  if (!checkedAt) return '';
  const date = new Date(checkedAt);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WalletPortfolioCard({
  consoleData,
  snapshot,
}: {
  consoleData: AstroConsoleData;
  snapshot?: WalletPortfolioSnapshot | null;
}) {
  const totalValue = toFiniteNumber(consoleData.walletPortfolioBalance);
  const tokens = consoleData.walletPortfolioTokens || EMPTY_PORTFOLIO_TOKENS;
  const holdings = useMemo(
    () => buildPortfolioHoldings(tokens, totalValue),
    [tokens, totalValue]
  );
  const visibleHoldings = useMemo(() => holdings.slice(0, 5), [holdings]);
  const otherValue = useMemo(
    () => holdings.slice(5).reduce((sum, holding) => sum + holding.value, 0),
    [holdings]
  );
  const chartHoldings = useMemo(
    () =>
      otherValue > 0 && totalValue > 0
        ? [
            ...visibleHoldings,
            {
              key: 'other',
              symbol: 'OTHER',
              chain: 'mixed',
              amount: 0,
              value: otherValue,
              percent: (otherValue / totalValue) * 100,
              color: '#565b66',
            },
          ]
        : visibleHoldings,
    [otherValue, totalValue, visibleHoldings]
  );
  const checkedLabel = useMemo(
    () => getPortfolioCheckedLabel(snapshot?.checkedAt),
    [snapshot?.checkedAt]
  );
  const addressLabel =
    consoleData.evmWalletAddress || consoleData.solWalletAddress
      ? formatWalletAddress(
          consoleData.evmWalletAddress || consoleData.solWalletAddress || ''
        )
      : consoleData.walletIdentityLabel;

  return (
    <div className={`${AGENT_PANEL_CLASS} mt-2 w-full overflow-hidden text-xs`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] bg-[#3fe08f]/15">
              <PieChart className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">Portfolio allocation</span>
          </div>
          <div className="dm-mono mt-1 truncate text-[10px] font-semibold text-[#6d717d]">
            {consoleData.walletIdentityLabel || addressLabel || 'Swop wallet'}
          </div>
        </div>
        <div className="dm-mono shrink-0 text-right text-[10px] font-semibold text-[#5a5e69]">
          <div className="text-[#eceef2]">{formatCompactUsd(totalValue)}</div>
          <div>{checkedLabel ? `checked ${checkedLabel}` : 'live wallet'}</div>
        </div>
      </div>

      <div className="grid gap-4 p-3.5 sm:grid-cols-[140px_1fr]">
        <div className="flex items-center justify-center">
          <div
            className="relative grid h-32 w-32 place-items-center rounded-full border border-white/[0.08] shadow-[inset_0_0_24px_rgba(0,0,0,0.42)]"
            style={{ background: buildConicGradient(chartHoldings) }}
          >
            <div className="grid h-[82px] w-[82px] place-items-center rounded-full border border-white/[0.07] bg-[#111318] text-center">
              <div>
                <div className={TICKET_LABEL_CLASS}>value</div>
                <div className="dm-mono mt-1 text-[15px] font-black text-[#eceef2]">
                  {formatCompactUsd(totalValue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 grid grid-cols-3 gap-2">
            <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
              <div className={TICKET_LABEL_CLASS}>tokens</div>
              <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
                {holdings.length}
              </div>
            </div>
            <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
              <div className={TICKET_LABEL_CLASS}>wallet</div>
              <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#eceef2]">
                {addressLabel || '--'}
              </div>
            </div>
            <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
              <div className={TICKET_LABEL_CLASS}>largest</div>
              <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#eceef2]">
                {holdings[0]?.symbol || '--'}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {consoleData.isWalletPortfolioBalanceLoading && !holdings.length ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2.5 text-[12px] font-semibold text-[#9396a0]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3fe08f]" />
                Loading wallet tokens
              </div>
            ) : holdings.length ? (
              <>
                {visibleHoldings.map((holding) => (
                  <div
                    key={holding.key}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: holding.color }}
                        />
                        <span className="truncate text-[13px] font-bold text-[#eceef2]">
                          {holding.symbol}
                        </span>
                        <span className="dm-mono shrink-0 text-[9.5px] font-semibold uppercase text-[#5a5e69]">
                          {holding.chain}
                        </span>
                      </div>
                      <div className="dm-mono mt-1 truncate text-[10.5px] font-semibold text-[#7d828d]">
                        {formatPortfolioAmount(holding.amount)} {holding.symbol}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="dm-mono text-[12px] font-black text-[#eceef2]">
                        {formatCompactUsd(holding.value)}
                      </div>
                      <div className="dm-mono mt-1 text-[10.5px] font-bold text-[#3fe08f]">
                        {formatPortfolioPercent(holding.percent)}
                      </div>
                    </div>
                    <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, Math.min(100, holding.percent))}%`,
                          backgroundColor: holding.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {otherValue > 0 && (
                  <div className="dm-mono flex items-center justify-between rounded-[9px] border border-white/[0.06] bg-[#101217] px-3 py-2 text-[10.5px] font-semibold text-[#737783]">
                    <span>{holdings.length - visibleHoldings.length} more tokens</span>
                    <span>{formatCompactUsd(otherValue)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[10px] border border-[#e8920f]/25 bg-[#e8920f]/10 px-3 py-2.5 text-[11px] font-semibold text-[#ffd08a]">
                No wallet token balances found yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {(consoleData.evmWalletAddress || consoleData.solWalletAddress) && (
        <div className="flex items-center gap-2 border-t border-white/[0.06] px-3.5 py-2.5 text-[10px] font-semibold text-[#6d717d]">
          <Wallet className="h-3.5 w-3.5 text-[#3fe08f]" />
          <span className="dm-mono truncate">
            {consoleData.evmWalletAddress || consoleData.solWalletAddress}
          </span>
        </div>
      )}
    </div>
  );
}

function buildWalletQrValue(walletReceive: WalletReceiveQrDetails) {
  if (
    walletReceive.chainType === 'evm' &&
    walletReceive.chainId &&
    walletReceive.address
  ) {
    return `ethereum:${walletReceive.address}@${walletReceive.chainId}`;
  }

  return walletReceive.address;
}

export function WalletReceiveQrCard({
  walletReceive,
}: {
  walletReceive: WalletReceiveQrDetails;
}) {
  const [copied, setCopied] = useState(false);
  const networkLabel =
    walletReceive.networkLabel ||
    walletReceive.network ||
    'Wallet';
  const qrValue = buildWalletQrValue(walletReceive);

  const handleCopy = async () => {
    const didCopy = await copyTextToClipboard(walletReceive.address);
    if (!didCopy) {
      toast.error('Could not copy address.');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-2 w-full rounded-[18px] border border-[#3fe08f]/35 bg-[#111318] p-4 text-[#eceef2] shadow-[0_18px_40px_-24px_rgba(63,224,143,0.45)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="dm-mono mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3fe08f]">
            <QrCode className="h-3.5 w-3.5" />
            Receive QR
          </div>
          <div className="text-base font-semibold">{networkLabel}</div>
          {walletReceive.assetHint && (
            <div className="mt-1 text-xs leading-relaxed text-[#9396a0]">
              {walletReceive.assetHint}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy address"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-[#eceef2] transition hover:border-[#3fe08f]/45 hover:text-[#3fe08f]"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div className="flex justify-center rounded-[14px] bg-white p-3">
          <QRCodeSVG
            value={qrValue}
            size={156}
            level="H"
            includeMargin
          />
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-[14px] border border-white/[0.07] bg-black/20 p-3">
          <div>
            <div className="dm-mono mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
              Address
            </div>
            <div className="dm-mono break-all text-xs leading-relaxed text-[#eceef2]">
              {walletReceive.address}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="dm-mono rounded-[8px] border border-[#3fe08f]/30 bg-[#3fe08f]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
              {formatWalletAddress(walletReceive.address)}
            </span>
            {walletReceive.source === 'client_session' && (
              <span className="dm-mono rounded-[8px] border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9396a0]">
                active wallet
              </span>
            )}
          </div>
          {walletReceive.warning && (
            <div className="text-[11px] leading-relaxed text-[#9396a0]">
              {walletReceive.warning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketplaceItemCards({ items }: { items: MarketplaceItemPreview[] }) {
  if (!items.length) return null;

  return (
    <div className="mt-2 grid gap-2">
      {items.slice(0, 4).map((item, index) => {
        const href =
          item.profileUrl ||
          (item.sellerUsername ? `/sp/${item.sellerUsername}` : null);
        return (
          <div
            key={item.id || item.templateId || index}
            className={`${AGENT_PANEL_CLASS} overflow-hidden`}
          >
            <div className="flex gap-3 p-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[12px] border border-white/[0.07] bg-black">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#3fe08f]">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold text-[#eceef2]">
                      {item.name}
                    </div>
                    <div className="dm-mono mt-1 truncate text-[10px] font-semibold text-[#6f7380]">
                      {item.sellerName || item.sellerUsername || 'Swop seller'} ·{' '}
                      {item.category || 'item'}
                    </div>
                  </div>
                  <div className="dm-mono shrink-0 text-[13px] font-bold text-[#3fe08f]">
                    {formatCompactUsd(item.price || 0)}
                  </div>
                </div>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#9396a0]">
                    {item.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="dm-mono text-[10px] font-semibold text-[#5a5e69]">
                    {item.available !== null && item.available !== undefined
                      ? `${item.available} available`
                      : 'marketplace'}
                  </span>
                  <button
                    type="button"
                    disabled={!href}
                    onClick={() => {
                      if (href) window.open(href, '_blank', 'noopener,noreferrer');
                    }}
                    className="dm-btn inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-3 text-[11px] font-bold text-[#dfffee] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
