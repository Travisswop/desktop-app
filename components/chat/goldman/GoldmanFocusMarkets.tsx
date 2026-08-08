'use client';

import { useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import type { GoldmanTradingStrategy } from './goldmanTypes';

/**
 * Which markets this plan is allowed to scan.
 *
 * `assets` is the single field that decides the tradable universe, and it was
 * only reachable by redrafting and re-approving the whole plan. It also has a
 * sharp edge worth surfacing rather than hiding: when the list is EMPTY the
 * agent infers markets from the strategy's own text — which is how a plan
 * titled "Hyperliquid Perps Strategy" once traded nothing but HYPE for weeks.
 * The empty state says so in as many words.
 *
 * Suggestions are grouped because the two venues behave differently: main-DEX
 * crypto always works, while the builder-DEX symbols need HIP-3 collateral to
 * be reachable at all.
 */

const SUGGESTIONS: { label: string; items: string[]; note?: string }[] = [
  { label: 'crypto', items: ['BTC', 'ETH', 'SOL', 'HYPE'] },
  {
    label: 'stocks & commodities',
    items: ['SPCX', 'NVDA', 'GOLD', 'CL'],
    note: 'builder DEX — needs HIP-3 collateral',
  },
];

export function GoldmanFocusMarkets({
  strategy,
  onSave,
  disabled,
}: {
  strategy?: GoldmanTradingStrategy | null;
  onSave: (assets: string[]) => Promise<void>;
  disabled?: boolean;
}) {
  const saved = useMemo(
    () =>
      (Array.isArray(strategy?.assets) ? strategy!.assets : [])
        .map((asset) => String(asset || '').trim().toUpperCase())
        .filter(Boolean),
    [strategy]
  );

  const [draft, setDraft] = useState<string[] | null>(null);
  const [entry, setEntry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const assets = draft ?? saved;
  const dirty = draft !== null && draft.join(',') !== saved.join(',');

  const add = (raw: string) => {
    const value = raw.trim().toUpperCase();
    if (!value || assets.includes(value) || assets.length >= 12) return;
    setDraft([...assets, value]);
    setEntry('');
  };
  const remove = (value: string) =>
    setDraft(assets.filter((asset) => asset !== value));

  const save = async () => {
    if (!dirty || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(assets);
      setDraft(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-[9px] border border-white/[0.06] bg-black/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="dm-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
          focus markets
        </span>
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={isSaving || disabled}
            className="dm-btn dm-mono flex h-6 items-center gap-1 rounded-[6px] border border-[#3fe08f]/30 bg-[#3fe08f]/10 px-2 text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#3fe08f] disabled:cursor-default disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Save
          </button>
        )}
      </div>

      {assets.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {assets.map((asset) => (
            <span
              key={asset}
              className="dm-mono flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/30 py-1 pl-2.5 pr-1.5 text-[10px] font-semibold text-[#eceef2]"
            >
              {asset}
              <button
                type="button"
                onClick={() => remove(asset)}
                disabled={disabled}
                title={`Stop trading ${asset}`}
                className="dm-btn grid h-4 w-4 place-items-center rounded-full text-[#737783] hover:text-[#ff8585] disabled:cursor-default"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        // Not a decorative empty state — this explains a real, surprising
        // behaviour that has already cost weeks of one-coin trading.
        <div className="mt-2 rounded-[7px] border border-[#f4c95d]/20 bg-[#f4c95d]/[0.06] px-2.5 py-2 text-[10px] leading-snug text-[#c9cdd6]">
          No markets pinned — Goldman infers them from the plan&apos;s wording,
          which can lock it to a single coin. Pick the markets you want.
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1.5">
        <input
          value={entry}
          onChange={(event) => setEntry(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(entry);
            }
          }}
          placeholder="add a symbol"
          disabled={disabled || assets.length >= 12}
          className="dm-mono h-7 min-w-0 flex-1 rounded-[6px] border border-white/[0.07] bg-[#0e1014] px-2 text-[10px] text-[#eceef2] outline-none placeholder:text-[#5a5e69] focus:border-[#f4c95d]/45 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => add(entry)}
          disabled={!entry.trim() || disabled || assets.length >= 12}
          className="dm-btn grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-white/[0.07] bg-black/25 text-[#9396a0] disabled:cursor-default disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {SUGGESTIONS.map((group) => {
        const available = group.items.filter((item) => !assets.includes(item));
        if (!available.length) return null;
        return (
          <div key={group.label} className="mt-2">
            <div className="dm-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#5a5e69]">
              {group.label}
              {group.note && (
                <span className="ml-1 normal-case tracking-normal text-[#737783]">
                  · {group.note}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {available.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => add(item)}
                  disabled={disabled || assets.length >= 12}
                  className="dm-btn dm-mono rounded-full border border-dashed border-white/[0.12] px-2.5 py-1 text-[10px] font-semibold text-[#9396a0] hover:border-[#f4c95d]/40 hover:text-[#f4c95d] disabled:cursor-default disabled:opacity-40"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
