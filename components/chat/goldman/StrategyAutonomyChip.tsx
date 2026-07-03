'use client';

// Compact status chip for a Goldman Sacks strategy row. Teaches the two-part
// autonomy gate at a glance: a strategy runs in *Proposal mode* (Goldman asks
// before each trade) until an Access Station venue gate is opened to
// autonomous. Reads the same derivation the StrategyApprovalModal uses via
// deriveStrategyAutonomy, so the two surfaces never disagree.

import { Info } from 'lucide-react';
import type { GoldmanTradingStrategy } from './goldmanTypes';
import {
  AUTONOMY_GATE_EXPLAINER,
  deriveStrategyAutonomy,
  type AccessLookup,
} from './goldmanAutonomy';

export function StrategyAutonomyChip({
  strategy,
  access,
}: {
  strategy: Pick<GoldmanTradingStrategy, 'venues' | 'runtime'>;
  access: AccessLookup | undefined;
}) {
  const autonomy = deriveStrategyAutonomy(strategy, access);
  const tone = autonomy.isAutonomous
    ? 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#9af7c4]'
    : 'border-[#f4c95d]/25 bg-[#f4c95d]/10 text-[#f4c95d]';

  return (
    <span
      data-testid="goldman-strategy-autonomy-chip"
      title={AUTONOMY_GATE_EXPLAINER}
      className={`dm-mono inline-flex max-w-full items-center gap-1 rounded-[7px] border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] ${tone}`}
    >
      <span className="truncate">
        {autonomy.label} · {autonomy.caption}
      </span>
      <Info className="h-2.5 w-2.5 flex-shrink-0 opacity-70" aria-hidden />
    </span>
  );
}
