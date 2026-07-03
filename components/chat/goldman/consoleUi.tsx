'use client';

// Console-panel primitives for the Goldman Sacks sections extracted from
// ChatArea.tsx. Visuals intentionally mirror the local ConsoleCard /
// SectionLabel helpers inside ChatArea so the new sections sit seamlessly in
// the existing Access Station panel.

import type { ReactNode } from 'react';

export function GoldmanConsoleCard({
  children,
  padClass = 'p-3.5',
}: {
  children: ReactNode;
  padClass?: string;
}) {
  return (
    <div
      className={`mb-1.5 rounded-[16px] border border-white/[0.07] bg-[#15171d] ${padClass}`}
    >
      {children}
    </div>
  );
}

export function GoldmanSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-0.5 pb-2 pt-3">
      <div className="dm-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#5a5e69]">
        {children}
      </div>
    </div>
  );
}
