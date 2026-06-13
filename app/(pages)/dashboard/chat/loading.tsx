export default function ChatLoading() {
  return (
    <div className="fixed inset-0 z-[80] flex h-dvh min-h-0 w-full overflow-hidden bg-black p-0 text-[#eceef2] sm:p-3">
      <div className="flex h-full min-h-0 w-full overflow-hidden rounded-none border border-white/[0.07] bg-[#08090b] sm:rounded-[16px]">
        <div className="hidden w-[320px] flex-shrink-0 border-r border-white/[0.07] bg-[#101217] p-6 md:block">
          <div className="mb-4 h-8 w-36 animate-pulse rounded bg-[#1b1e25]" />
          <div className="mb-8 h-11 w-full animate-pulse rounded-[12px] bg-[#15171d]" />
          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-[14px] bg-[#15171d]" />
            <div className="h-16 animate-pulse rounded-[14px] bg-[#15171d]" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="dm-mono mx-auto mb-5 grid h-14 w-14 animate-pulse place-items-center rounded-[14px] border border-[#3fe08f]/30 bg-black text-lg font-bold text-[#3fe08f]">
              $_
            </div>
            <div className="mx-auto mb-3 h-5 w-44 animate-pulse rounded bg-[#1b1e25]" />
            <div className="mx-auto h-3 w-64 animate-pulse rounded bg-[#15171d]" />
          </div>
        </div>
      </div>
    </div>
  );
}
