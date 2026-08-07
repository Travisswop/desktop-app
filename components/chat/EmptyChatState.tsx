'use client';

import { Loader2, MessageCircle } from 'lucide-react';

interface EmptyChatStateProps {
  astroDeskOpenError?: string | null;
  isOpeningAstroDesk?: boolean;
  onOpenAstroDesk?: (() => void) | null;
}

export default function EmptyChatState({
  astroDeskOpenError = null,
  isOpeningAstroDesk = false,
  onOpenAstroDesk,
}: EmptyChatStateProps) {
  return (
    <div className="dm-rise max-w-sm text-center">
      <div className="dm-mono mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[16px] border border-[#3fe08f]/30 bg-black text-xl font-bold text-[#3fe08f] shadow-[inset_0_0_18px_rgba(63,224,143,0.12)]">
        $_
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#eceef2]">
        Swop Messages
      </h2>
      <p className="mt-2 text-sm text-[#9396a0]">
        Open Astro Trading Desk to start a usable agent thread, or create a
        group and mention @astro.
      </p>
      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onOpenAstroDesk || undefined}
          disabled={!onOpenAstroDesk || isOpeningAstroDesk}
          className="dm-btn inline-flex items-center gap-2 rounded-[12px] border border-[#3fe08f]/35 bg-[#10251a] px-4 py-2.5 text-sm font-semibold text-[#d7ffe8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOpeningAstroDesk ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          Open Astro Trading Desk
        </button>
        <p className="max-w-[18rem] text-xs leading-relaxed text-[#6f7380]">
          If Create Chat does not list Astro, use this desk entry instead.
        </p>
        {astroDeskOpenError ? (
          <p className="max-w-[18rem] text-xs leading-relaxed text-[#ff9ea1]">
            {astroDeskOpenError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
