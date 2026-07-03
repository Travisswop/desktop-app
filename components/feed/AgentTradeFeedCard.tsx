'use client';

import { ArrowDownRight, ArrowUpRight, Bot, RefreshCcw } from 'lucide-react';

// Renders a feed post authored by a user's autonomous agent (postType ===
// 'agentTrade'). The post is authored AS the user (smartsiteEnsName is the
// user's swop.id) but carries an `agent` block so we can badge it as the
// user's agent. Every field is optional and defensively coerced — the backend
// ships this shape tolerantly from a parallel branch.

type AgentTradeAction = 'entry' | 'exit' | 'redeem' | string;

interface AgentTradeAgent {
  isAgentTrade?: boolean;
  agentId?: string;
  agentName?: string;
}

interface AgentTradeContent {
  action?: AgentTradeAction;
  venue?: string;
  market?: string;
  asset?: string;
  side?: string;
  sizeUsd?: number | string | null;
  pnlUsd?: number | string | null;
  txHash?: string;
  summary?: string;
}

interface AgentTradeFeed {
  content?: AgentTradeContent;
  agent?: AgentTradeAgent;
  smartsiteEnsName?: string;
  smartsiteUserName?: string;
  createdAt?: string;
}

interface AgentTradeFeedCardProps {
  feed: AgentTradeFeed;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function maybeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeAction(action: AgentTradeAction | undefined): {
  key: 'entry' | 'exit' | 'redeem';
  label: string;
} {
  const value = String(action || '').toLowerCase();
  if (value === 'exit') return { key: 'exit', label: 'Exit' };
  if (value === 'redeem') return { key: 'redeem', label: 'Redeem' };
  return { key: 'entry', label: 'Entry' };
}

function titleCase(value: unknown) {
  const text = String(value || '').replace(/[-_]/g, ' ').trim();
  if (!text) return '';
  return text
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AgentTradeFeedCard({ feed }: AgentTradeFeedCardProps) {
  const content = feed?.content || {};
  const { key: actionKey, label: actionLabel } = normalizeAction(
    content.action,
  );
  // Author handle == the user's swop.id (post is authored as the user).
  const userHandle =
    feed?.smartsiteEnsName || feed?.smartsiteUserName || 'You';
  // Agent identity for the badge.
  const agentName = feed?.agent?.agentName || 'agent';

  const venue = titleCase(content.venue);
  const marketOrAsset = content.market || content.asset || '';
  const side = content.side ? String(content.side).toUpperCase() : '';
  const sizeUsd = maybeNumber(content.sizeUsd);
  const pnlUsd = maybeNumber(content.pnlUsd);
  const showsPnl =
    (actionKey === 'exit' || actionKey === 'redeem') && pnlUsd !== null;
  const pnlPositive = (pnlUsd ?? 0) >= 0;

  return (
    <div
      className="mx-auto mt-2 w-full max-w-[430px]"
      data-testid="agent-trade-feed-card"
    >
      <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <div className="px-3 pt-3 sm:px-3.5">
          <div className="flex items-start justify-between gap-3">
            <span
              className={`inline-flex rounded-[9px] border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${
                actionKey === 'entry'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : actionKey === 'exit'
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {actionLabel}
            </span>
            {/* 🤖 <user>'s agent badge — derived from agent.agentName */}
            <span
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono text-[10px] font-black text-indigo-600"
              title={agentName}
              data-testid="agent-trade-badge"
            >
              <Bot className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                🤖 {userHandle}&apos;s agent
              </span>
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[16px] font-black leading-tight text-gray-950">
                {marketOrAsset || venue || agentName}
              </p>
              <p className="mt-0.5 truncate font-mono text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                {[venue, side].filter(Boolean).join(' · ') || agentName}
              </p>
            </div>
            {sizeUsd !== null && (
              <div className="min-w-[96px] text-right">
                <p className="font-mono text-[20px] font-black leading-none text-black">
                  {usd.format(sizeUsd)}
                </p>
                <p className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">
                  size
                </p>
              </div>
            )}
          </div>

          {showsPnl && (
            <div
              className={`mt-3 flex items-center justify-between rounded-[12px] border px-3 py-2 ${
                pnlPositive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-600'
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-[12px] font-black">
                {pnlPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{actionKey === 'redeem' ? 'Redeemed' : 'Closed'}</span>
              </div>
              <div className="font-mono text-[15px] font-black">
                {pnlPositive ? '+' : ''}
                {usd.format(pnlUsd ?? 0)}
              </div>
            </div>
          )}

          {content.summary && (
            <p className="mt-3 flex items-start gap-2 rounded-[12px] border border-black/[0.04] bg-gray-50 px-3 py-2 font-mono text-[11px] font-semibold leading-relaxed text-gray-700">
              <RefreshCcw
                className="mt-0.5 h-3 w-3 shrink-0 text-gray-400"
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">{content.summary}</span>
            </p>
          )}
        </div>

        <div className="px-3.5 pb-3 pt-2 sm:px-4">
          <p className="truncate font-mono text-[9px] font-black uppercase tracking-[0.16em] text-gray-400">
            Auto-traded by {agentName}
          </p>
        </div>
      </div>
    </div>
  );
}
