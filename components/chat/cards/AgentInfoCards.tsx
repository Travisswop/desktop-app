'use client';

// Read-only agent display cards for the Astro chat: sports research briefs,
// research sources, loading placeholder, wallet receive QR, and marketplace
// item previews. Extracted from ChatArea.tsx.

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  ShoppingBag,
} from 'lucide-react';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  formatCompactUsd,
  formatWalletAddress,
} from '@/lib/chat/ticketFormat';
import { AGENT_PANEL_CLASS } from '@/lib/chat/ticketStyles';
import type {
  MarketplaceItemPreview,
  ResearchSourcePreview,
  SportsResearchBrief,
  WalletReceiveQrDetails,
} from '@/lib/chat/agentCardTypes';

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
