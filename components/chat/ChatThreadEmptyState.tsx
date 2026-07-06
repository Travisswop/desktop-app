'use client';

type ChatThreadEmptyStateProps = {
  onOpenAstroThread?: () => void | Promise<void>;
  isOpeningAstroThread?: boolean;
  errorMessage?: string | null;
};

export default function ChatThreadEmptyState({
  onOpenAstroThread,
  isOpeningAstroThread = false,
  errorMessage = null,
}: ChatThreadEmptyStateProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center bg-[#08090b]">
      <div className="dm-rise max-w-sm text-center">
        <div className="dm-mono mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[16px] border border-[#3fe08f]/30 bg-black text-xl font-bold text-[#3fe08f] shadow-[inset_0_0_18px_rgba(63,224,143,0.12)]">
          $_
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#eceef2]">
          Swop Messages
        </h2>
        <p className="mt-2 text-sm text-[#9396a0]">
          Start with Astro Trading Desk, or create a group and mention @astro.
        </p>

        {onOpenAstroThread ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => void onOpenAstroThread()}
              disabled={isOpeningAstroThread}
              className="dm-btn inline-flex items-center justify-center rounded-[11px] border border-[#3fe08f]/35 bg-[#153425] px-4 py-2.5 text-[13px] font-semibold text-[#3fe08f] transition hover:border-[#3fe08f]/55 hover:bg-[#183d2b] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isOpeningAstroThread
                ? 'Opening Astro...'
                : 'Open Astro Trading Desk'}
            </button>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 text-xs leading-relaxed text-[#ff8589]">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
