'use client';

import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';

type PerpsContent = {
  platform?: string;
  marketId?: string;
  marketName?: string;
  coin?: string;
  side?: 'LONG' | 'SHORT';
  orderType?: 'market' | 'limit' | 'tpsl' | 'close';
  marginMode?: 'cross' | 'isolated';
  leverage?: number;
  sizeCoins?: number;
  sizeUsd?: number;
  entryPrice?: number;
  limitPrice?: number;
  markPrice?: number;
  liquidationPrice?: number;
  marginRequired?: number;
  estFees?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  orderId?: string;
};

interface PerpsFeedCardProps {
  content: PerpsContent;
  userName?: string;
}

function formatUsd(value: unknown, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatNumber(value: unknown, digits = 4) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function label(value?: string) {
  if (!value) return '-';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function PerpsFeedCard({
  content,
  userName,
}: PerpsFeedCardProps) {
  const isLong = content.side !== 'SHORT';
  const accent = isLong ? 'emerald' : 'rose';
  const marketUrl = content.coin
    ? `https://app.hyperliquid.xyz/trade/${encodeURIComponent(content.coin)}`
    : undefined;

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-black/[0.08] bg-white">
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isLong
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-rose-50 border-rose-100'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isLong
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            {isLong ? (
              <ArrowUpRight className="w-5 h-5" />
            ) : (
              <ArrowDownRight className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide font-bold text-gray-500">
              {userName ? `${userName} opened perps` : 'Perps order'}
            </p>
            <h3 className="text-base font-bold text-gray-950 truncate">
              {content.side ?? 'LONG'} {content.marketName ?? content.coin}
            </h3>
          </div>
        </div>

        <div
          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            accent === 'emerald'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}
        >
          {label(content.orderType)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-black/[0.06]">
        <Metric label="Size" value={formatUsd(content.sizeUsd)} />
        <Metric label="Entry" value={formatUsd(content.entryPrice)} />
        <Metric
          label="Leverage"
          value={
            content.leverage
              ? `${content.leverage}x ${label(content.marginMode)}`
              : label(content.marginMode)
          }
        />
        <Metric
          label="Liquidation"
          value={formatUsd(content.liquidationPrice)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4">
        <Metric
          label="Amount"
          value={`${formatNumber(content.sizeCoins)} ${content.coin ?? ''}`}
        />
        <Metric label="Margin" value={formatUsd(content.marginRequired)} />
        <Metric label="Fees" value={formatUsd(content.estFees)} />
        <Metric label="Mark" value={formatUsd(content.markPrice)} />
      </div>

      {(content.takeProfitPrice || content.stopLossPrice || marketUrl) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-black/[0.06] text-xs text-gray-600">
          {content.takeProfitPrice && (
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
              TP {formatUsd(content.takeProfitPrice)}
            </span>
          )}
          {content.stopLossPrice && (
            <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold">
              SL {formatUsd(content.stopLossPrice)}
            </span>
          )}
          {marketUrl && (
            <a
              href={marketUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto inline-flex items-center gap-1 font-semibold text-gray-800 hover:text-black"
            >
              Hyperliquid
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 border-r border-black/[0.06] last:border-r-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-gray-950 tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}
