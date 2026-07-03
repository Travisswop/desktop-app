'use client';

// Brain & memory controls for the Goldman Sacks console panel.
// GET/PATCH .../agents/goldman-sacks/brain plus POST .../brain/memory-reset.
// The whole section hides itself while the backend endpoint returns 404
// (brain controls shipping from a parallel branch).

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrainCircuit, Loader2, RotateCcw, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { toFiniteNumber } from '@/lib/chat/ticketFormat';
import {
  fetchGoldmanBrain,
  resetGoldmanBrainMemory,
  updateGoldmanBrain,
} from './goldmanApi';
import { GoldmanConsoleCard, GoldmanSectionLabel } from './consoleUi';
import type { GoldmanBrainState } from './goldmanTypes';

const TIER_OPTIONS: Array<{
  tier: 'fast' | 'deep';
  label: string;
  detail: string;
}> = [
  {
    tier: 'fast',
    label: 'Fast',
    detail: 'Quick model in the loop — cheaper, checks every cycle.',
  },
  {
    tier: 'deep',
    label: 'Deep',
    detail: 'Stronger model reviews entries and exits — costs more.',
  },
];

export function GoldmanBrainControls({
  groupId,
  accessToken,
}: {
  groupId?: string;
  accessToken?: string | null;
}) {
  const [brain, setBrain] = useState<GoldmanBrainState | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingMemory, setIsResettingMemory] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!groupId || !accessToken) {
      setBrain(null);
      setIsSupported(false);
      return;
    }

    fetchGoldmanBrain({ groupId, accessToken })
      .then((state) => {
        if (requestId !== requestIdRef.current) return;
        setBrain(state);
        setIsSupported(Boolean(state));
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        // Treat hard failures like an unsupported endpoint — hide the section
        // rather than surfacing a broken control block.
        setBrain(null);
        setIsSupported(false);
      });
  }, [accessToken, groupId]);

  const applyPatch = useCallback(
    (patch: {
      tier?: 'fast' | 'deep';
      memoryEnabled?: boolean;
      feedSharingEnabled?: boolean;
    }) => {
      if (!groupId || !accessToken || isSaving) return;

      // Optimistically apply the patch, keeping the prior snapshot so we can
      // revert if the request fails.
      const previous = brain;
      setBrain((current) => ({ ...current, ...patch }));

      setIsSaving(true);
      updateGoldmanBrain({ groupId, accessToken, patch })
        .then((state) => {
          if (state) {
            setBrain(state);
          }
          // Null response = no payload echoed back; keep the optimistic value.
        })
        .catch((error) => {
          setBrain(previous);
          toast.error(
            error instanceof Error
              ? error.message
              : 'Could not update brain settings.'
          );
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [accessToken, brain, groupId, isSaving]
  );

  const handleResetMemory = useCallback(() => {
    if (!groupId || !accessToken || isResettingMemory) return;

    setIsResettingMemory(true);
    resetGoldmanBrainMemory({ groupId, accessToken })
      .then(() => {
        toast.success('Goldman memory reset.');
        setShowResetConfirm(false);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not reset Goldman memory.'
        );
      })
      .finally(() => {
        setIsResettingMemory(false);
      });
  }, [accessToken, groupId, isResettingMemory]);

  if (!isSupported || !brain) return null;

  const tier = brain.tier === 'deep' ? 'deep' : 'fast';
  const memoryEnabled = Boolean(brain.memoryEnabled);
  // Feed sharing defaults to on: treat only an explicit `false` as disabled so
  // the toggle reads "on" before the backend echoes the field.
  const feedSharingEnabled = brain.feedSharingEnabled !== false;
  const usage = brain.usage || null;
  const calls = toFiniteNumber(usage?.calls);
  const callCap = toFiniteNumber(usage?.callCap);
  const usageRatio = callCap > 0 ? Math.min(1, calls / callCap) : 0;
  const isExhausted = Boolean(usage?.exhausted);

  return (
    <div data-testid="goldman-brain-controls">
      <GoldmanSectionLabel>brain &amp; memory</GoldmanSectionLabel>
      <GoldmanConsoleCard padClass="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] bg-[#b893ff]/15">
              <BrainCircuit className="h-4 w-4 text-[#b893ff]" />
            </span>
            <div>
              <div className="text-[12.5px] font-semibold leading-tight text-[#eceef2]">
                Trading brain
              </div>
              <div className="dm-mono mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#5a5e69]">
                {brain.enabled === false ? 'disabled' : `${tier} tier`}
              </div>
            </div>
          </div>
          {isSaving && (
            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-[#b893ff]" />
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {TIER_OPTIONS.map((option) => {
            const selected = tier === option.tier;
            return (
              <button
                key={option.tier}
                type="button"
                aria-pressed={selected}
                data-testid={`goldman-brain-tier-${option.tier}`}
                disabled={isSaving || selected}
                onClick={() => applyPatch({ tier: option.tier })}
                className={`dm-btn rounded-[9px] border px-2.5 py-2 text-left disabled:cursor-default ${
                  selected
                    ? 'border-[#b893ff]/35 bg-[#b893ff]/15'
                    : 'border-white/[0.07] bg-black/20'
                }`}
              >
                <span
                  className={`dm-mono block text-[10px] font-bold uppercase tracking-[0.08em] ${
                    selected ? 'text-[#d9c6ff]' : 'text-[#9396a0]'
                  }`}
                >
                  {option.label}
                </span>
                <span className="mt-1 block text-[9.5px] font-medium leading-snug text-[#737783]">
                  {option.detail}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[9px] border border-white/[0.06] bg-black/20 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[11.5px] font-semibold text-[#eceef2]">
              Trade memory
            </div>
            <div className="dm-mono mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#5a5e69]">
              lessons from closed trades inform new ones
            </div>
          </div>
          <button
            type="button"
            aria-pressed={memoryEnabled}
            aria-label="Trade memory"
            data-testid="goldman-brain-memory-toggle"
            disabled={isSaving}
            onClick={() => applyPatch({ memoryEnabled: !memoryEnabled })}
            className={`dm-btn relative h-6 w-11 flex-shrink-0 rounded-full border transition ${
              memoryEnabled
                ? 'border-[#b893ff]/40 bg-[#b893ff]/25'
                : 'border-white/[0.08] bg-black/45'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                memoryEnabled
                  ? 'left-[19px] bg-[#b893ff]'
                  : 'left-0.5 bg-[#5a5e69]'
              }`}
            />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[9px] border border-white/[0.06] bg-black/20 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Share2 className="h-3.5 w-3.5 flex-shrink-0 text-[#b893ff]" />
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold text-[#eceef2]">
                Share agent trades
              </div>
              <div className="dm-mono mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#5a5e69]">
                post this agent&apos;s trades to your feed
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={feedSharingEnabled}
            aria-label="Share agent trades"
            data-testid="goldman-brain-feed-sharing-toggle"
            disabled={isSaving}
            onClick={() =>
              applyPatch({ feedSharingEnabled: !feedSharingEnabled })
            }
            className={`dm-btn relative h-6 w-11 flex-shrink-0 rounded-full border transition ${
              feedSharingEnabled
                ? 'border-[#b893ff]/40 bg-[#b893ff]/25'
                : 'border-white/[0.08] bg-black/45'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                feedSharingEnabled
                  ? 'left-[19px] bg-[#b893ff]'
                  : 'left-0.5 bg-[#5a5e69]'
              }`}
            />
          </button>
        </div>

        {usage && (
          <div className="mt-3 rounded-[9px] border border-white/[0.06] bg-black/20 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="dm-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#737783]">
                brain budget today
              </span>
              <span
                className={`dm-mono text-[10px] font-bold ${
                  isExhausted ? 'text-[#ff8585]' : 'text-[#eceef2]'
                }`}
              >
                {calls}
                {callCap > 0 ? ` / ${callCap}` : ''} calls
              </span>
            </div>
            {callCap > 0 && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/45">
                <div
                  className={`h-full rounded-full ${
                    isExhausted
                      ? 'bg-[#ff5d63]'
                      : usageRatio > 0.8
                      ? 'bg-[#f4c95d]'
                      : 'bg-[#b893ff]'
                  }`}
                  style={{ width: `${Math.round(usageRatio * 100)}%` }}
                />
              </div>
            )}
            {isExhausted && (
              <div className="mt-1.5 text-[10px] font-semibold leading-snug text-[#ff8585]">
                Brain budget exhausted — strategies fall back to rule-based
                checks until tomorrow.
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          {showResetConfirm ? (
            <div className="rounded-[9px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2.5">
              <div className="text-[10.5px] font-semibold leading-snug text-[#ff8585]">
                Erase every stored trade lesson? Goldman starts fresh and this
                cannot be undone.
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  data-testid="goldman-brain-memory-reset-confirm"
                  disabled={isResettingMemory}
                  onClick={handleResetMemory}
                  className="dm-btn dm-mono flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-[#ff5d63]/35 bg-[#ff5d63]/15 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#ff8585] disabled:cursor-default disabled:opacity-50"
                >
                  {isResettingMemory ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Reset memory
                </button>
                <button
                  type="button"
                  disabled={isResettingMemory}
                  onClick={() => setShowResetConfirm(false)}
                  className="dm-btn dm-mono flex h-8 flex-1 items-center justify-center rounded-[8px] border border-white/[0.07] bg-black/20 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9396a0] disabled:cursor-default disabled:opacity-50"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-testid="goldman-brain-memory-reset"
              onClick={() => setShowResetConfirm(true)}
              className="dm-btn dm-mono flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] border border-white/[0.07] bg-black/20 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9396a0] hover:text-[#eceef2]"
            >
              <RotateCcw className="h-3 w-3" />
              Reset memory
            </button>
          )}
        </div>
      </GoldmanConsoleCard>
    </div>
  );
}
