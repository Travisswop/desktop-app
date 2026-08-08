'use client';

import { AlertTriangle, Info, XOctagon } from 'lucide-react';
import type { GoldmanConfigIssue, GoldmanTradingStrategy } from './goldmanTypes';

/**
 * Why this plan cannot trade, said plainly.
 *
 * A misconfigured strategy looks exactly like a working one from here: state
 * "running", heartbeat ticking, nothing ever opening. Every issue rendered
 * below is one that has actually happened and had to be dug out of Mongo and
 * CloudWatch by hand — orders sized under the venue minimum, a reserve fencing
 * the whole balance, a venue switched off underneath the plan.
 *
 * Deliberately NOT gated on runtime.state === 'running': a blocked plan is
 * precisely when the owner needs to see this, and several of these faults stop
 * it ever reaching a running state.
 */

const TONE: Record<
  string,
  { wrap: string; icon: string; Icon: typeof AlertTriangle }
> = {
  blocking: {
    wrap: 'border-[#ff5d63]/30 bg-[#ff5d63]/[0.07]',
    icon: 'text-[#ff8585]',
    Icon: XOctagon,
  },
  warning: {
    wrap: 'border-[#f4c95d]/25 bg-[#f4c95d]/[0.06]',
    icon: 'text-[#f4c95d]',
    Icon: AlertTriangle,
  },
  info: {
    wrap: 'border-white/[0.08] bg-black/25',
    icon: 'text-[#9396a0]',
    Icon: Info,
  },
};

export function GoldmanConfigIssuesPanel({
  strategy,
}: {
  strategy?: GoldmanTradingStrategy | null;
}) {
  const issues = strategy?.runtime?.configIssues;
  if (!Array.isArray(issues) || issues.length === 0) return null;

  // Worst first — a blocking fault is the reason nothing is happening; a
  // backoff note underneath it is just consequence.
  const order: Record<string, number> = { blocking: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort(
    (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  );

  return (
    <div className="mt-2 space-y-1.5" data-testid="goldman-config-issues">
      {sorted.map((issue: GoldmanConfigIssue, index) => {
        const tone = TONE[issue.severity] || TONE.info;
        const { Icon } = tone;
        return (
          <div
            key={`${issue.code}-${index}`}
            className={`rounded-[9px] border px-3 py-2 ${tone.wrap}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`mt-[1px] h-3.5 w-3.5 shrink-0 ${tone.icon}`} />
              <div className="min-w-0">
                <div className="dm-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#eceef2]">
                  {issue.title}
                </div>
                <div className="mt-1 text-[10.5px] leading-snug text-[#c9cdd6]">
                  {issue.detail}
                </div>
                {issue.fix && (
                  <div className="mt-1 text-[10px] leading-snug text-[#9396a0]">
                    <span className="dm-mono font-bold uppercase tracking-[0.08em] text-[#737783]">
                      fix{' '}
                    </span>
                    {issue.fix}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
