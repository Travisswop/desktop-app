'use client';

import type { GoldmanTradingStrategy } from './goldmanTypes';

// Lives next to the plan it belongs to.
//
// This used to sit inside a vault-wide "AGENT STATUS" card that also carried a
// status line duplicating the sections below and a Run button that did nothing
// while idle. The card was removed; this is the only part of it that was
// pulling its weight, so it moved to the running plan's row — where the thing
// it describes actually is.

function formatEvaluationTime(at?: string | null): string | null {
  if (!at) return null;
  const ts = Date.parse(at);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function checkDotClass(status?: string | null): string {
  if (status === 'ok' || status === 'open') return 'bg-[#3fe08f]';
  if (status === 'blocked') return 'bg-[#ff5d63]';
  return 'bg-[#5a5e69]';
}

export function GoldmanThinkingPanel({
  strategy,
  formatUsd,
}: {
  strategy?: GoldmanTradingStrategy | null;
  // Injected so this component doesn't reach for the console's currency helper.
  formatUsd: (value: number) => string;
}) {
  const evaluation = strategy?.runtime?.lastEvaluation;
  if (strategy?.runtime?.state !== 'running' || !evaluation) return null;

  const at = formatEvaluationTime(evaluation.at);
  const checks = (evaluation.checks || []).slice(0, 6);
  const markets = (evaluation.predictionsMarkets || []).slice(0, 3);

  // Allocation targets are only written when the owner set percentages.
  const allocation = evaluation.allocation;
  const targetParts: string[] = [];
  if (allocation) {
    const predictionsTarget = Number(allocation.predictionsTargetPct) || 0;
    const perpsTarget = Number(allocation.perpsTargetPct) || 0;
    if (predictionsTarget > 0) targetParts.push(`predictions ${predictionsTarget}%`);
    if (perpsTarget > 0) targetParts.push(`perps ${perpsTarget}%`);
    const perpsNow = Number(allocation.perpsCurrentUsd) || 0;
    if (targetParts.length > 0 && perpsNow > 0) {
      targetParts.push(`perps now ${formatUsd(perpsNow)}`);
    }
  }

  return (
    <div
      data-testid="goldman-thinking-panel"
      className="mt-1.5 rounded-[8px] border border-white/[0.06] bg-black/25 px-2.5 py-2"
    >
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fe08f] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3fe08f]" />
        </span>
        <span className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
          thinking
        </span>
        {at && (
          <span className="dm-mono ml-auto text-[8.5px] text-[#5a5e69]">{at}</span>
        )}
      </div>
      <div className="mt-1.5 space-y-1">
        {checks.map((check, index) => (
          <div key={`${check.label || index}`} className="flex items-start gap-1.5">
            <span
              className={`mt-[3px] h-1 w-1 shrink-0 rounded-full ${checkDotClass(
                check.status
              )}`}
            />
            <span className="line-clamp-1 text-[9.5px] leading-snug text-[#9aa0ab]">
              <span className="font-semibold text-[#c9cdd6]">{check.label}</span>{' '}
              {check.detail}
            </span>
          </div>
        ))}
        {markets.length > 0 && (
          <div className="line-clamp-2 pl-2.5 text-[9px] italic leading-snug text-[#7b8290]">
            {markets.join(' · ')}
          </div>
        )}
        {targetParts.length > 0 && (
          <div className="line-clamp-1 pl-2.5 text-[9px] leading-snug text-[#7b8290]">
            targets: {targetParts.join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}
