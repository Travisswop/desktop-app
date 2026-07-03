'use client';

// One-shot "Full Autonomy" switch for the Goldman Sacks console panel.
//
// This is the convenience control that flips every strategy between Proposal
// mode (Goldman asks before each trade) and Full autonomy (trades on its own,
// within the risk limits) in a single action — the same distinction the
// per-strategy autonomy chips surface. It sits ON TOP of the granular per-venue
// Access Station toggles, which remain the fine-grained control.
//
// POST .../agents/goldman-sacks/autonomy { level }. The response carries the
// updated config.accessStation, which we merge into the console's local access
// state so the autonomy chips flip immediately. The whole control hides itself
// if the endpoint 404s (backend not shipped yet).

import { useCallback, useState } from 'react';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateGoldmanAutonomy } from './goldmanApi';
import { GoldmanConsoleCard, GoldmanSectionLabel } from './consoleUi';
import type { GoldmanAutonomyLevel } from './goldmanTypes';

export function GoldmanAutonomyControl({
  groupId,
  accessToken,
  isFullAutonomy,
  onApplyAccessStation,
}: {
  groupId?: string;
  accessToken?: string | null;
  // Derived from the live access state (a write venue is open == autonomous).
  isFullAutonomy: boolean;
  // Merge the server-returned config.accessStation into local access state so
  // the per-strategy autonomy chips flip immediately.
  onApplyAccessStation: (accessStation: unknown) => void;
}) {
  const [isSupported, setIsSupported] = useState(true);
  const [pendingLevel, setPendingLevel] = useState<GoldmanAutonomyLevel | null>(
    null
  );
  const [showEnableConfirm, setShowEnableConfirm] = useState(false);
  // Muted note shown when gates are open but live execution is still gated
  // platform-wide (liveExecutionEnabled === false after enabling full).
  const [gatedNote, setGatedNote] = useState(false);

  const isSaving = pendingLevel !== null;
  // Optimistic view: while a request is in flight, show the target level.
  const showingFull = pendingLevel ? pendingLevel === 'full' : isFullAutonomy;

  const applyLevel = useCallback(
    (level: GoldmanAutonomyLevel) => {
      if (!groupId || !accessToken || isSaving) return;

      setPendingLevel(level);
      setShowEnableConfirm(false);
      updateGoldmanAutonomy({ groupId, accessToken, level })
        .then((update) => {
          if (!update.supported) {
            // 404 — backend has not shipped the switch; hide the control.
            setIsSupported(false);
            return;
          }
          const accessStation = update.result?.agent?.config?.accessStation;
          if (accessStation) {
            onApplyAccessStation(accessStation);
          }
          if (level === 'full') {
            setGatedNote(update.result?.autonomy?.liveExecutionEnabled === false);
          } else {
            setGatedNote(false);
          }
        })
        .catch((error) => {
          // Revert is implicit — we never mutated local state until the server
          // confirmed, so the buttons snap back to the real access-derived level.
          toast.error(
            error instanceof Error
              ? error.message
              : 'Could not update autonomy.'
          );
        })
        .finally(() => {
          setPendingLevel(null);
        });
    },
    [accessToken, groupId, isSaving, onApplyAccessStation]
  );

  if (!isSupported) return null;

  return (
    <div data-testid="goldman-autonomy-control">
      <GoldmanSectionLabel>autonomy</GoldmanSectionLabel>
      <GoldmanConsoleCard padClass="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] ${
                showingFull
                  ? 'bg-[#3fe08f]/15 text-[#3fe08f]'
                  : 'bg-[#f4c95d]/15 text-[#f4c95d]'
              }`}
            >
              {showingFull ? (
                <Zap className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </span>
            <div>
              <div className="text-[12.5px] font-semibold leading-tight text-[#eceef2]">
                Full autonomy
              </div>
              <div className="dm-mono mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#5a5e69]">
                {showingFull ? 'trades on its own' : 'approves each trade'}
              </div>
            </div>
          </div>
          {isSaving && (
            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-[#3fe08f]" />
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={!showingFull}
            data-testid="goldman-autonomy-proposal"
            disabled={isSaving || (!showingFull && !showEnableConfirm)}
            onClick={() => {
              setShowEnableConfirm(false);
              applyLevel('proposal');
            }}
            className={`dm-btn dm-mono rounded-[9px] border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] disabled:cursor-default ${
              !showingFull
                ? 'border-[#f4c95d]/35 bg-[#f4c95d]/15 text-[#f4c95d]'
                : 'border-white/[0.07] bg-black/20 text-[#9396a0]'
            }`}
          >
            Proposal mode
          </button>
          <button
            type="button"
            aria-pressed={showingFull}
            data-testid="goldman-autonomy-full"
            disabled={isSaving || showingFull}
            onClick={() => setShowEnableConfirm(true)}
            className={`dm-btn dm-mono rounded-[9px] border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] disabled:cursor-default ${
              showingFull
                ? 'border-[#3fe08f]/35 bg-[#3fe08f]/15 text-[#9af7c4]'
                : 'border-white/[0.07] bg-black/20 text-[#9396a0]'
            }`}
          >
            Full autonomy
          </button>
        </div>

        {showEnableConfirm && !showingFull && (
          <div className="mt-3 rounded-[9px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 px-3 py-2.5">
            <div className="text-[10.5px] font-semibold leading-snug text-[#9af7c4]">
              Goldman will place trades on its own, within your risk limits. You
              can switch back anytime.
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                data-testid="goldman-autonomy-full-confirm"
                disabled={isSaving}
                onClick={() => applyLevel('full')}
                className="dm-btn dm-mono flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-[#3fe08f]/35 bg-[#3fe08f]/15 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9af7c4] disabled:cursor-default disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                Enable full autonomy
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowEnableConfirm(false)}
                className="dm-btn dm-mono flex h-8 flex-1 items-center justify-center rounded-[8px] border border-white/[0.07] bg-black/20 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9396a0] disabled:cursor-default disabled:opacity-50"
              >
                Not yet
              </button>
            </div>
          </div>
        )}

        {gatedNote && showingFull && (
          <p className="mt-3 text-[10px] font-medium leading-snug text-[#737783]">
            Gates open — live trading turns on once enabled platform-wide.
          </p>
        )}
      </GoldmanConsoleCard>
    </div>
  );
}
