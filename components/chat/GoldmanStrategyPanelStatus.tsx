import type {
  GoldmanPanelTone,
  GoldmanStrategyPanelSummary,
} from '@/lib/chat/goldmanStrategyRuntime';

function goldmanPanelToneClass(tone: GoldmanPanelTone) {
  if (tone === 'positive') {
    return 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#9af7c4]';
  }
  if (tone === 'warning') {
    return 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]';
  }
  if (tone === 'danger') {
    return 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]';
  }
  return 'border-white/[0.08] bg-black/25 text-[#cfd3dd]';
}

export function GoldmanStrategyPanelStatus({
  summary,
}: {
  summary: GoldmanStrategyPanelSummary;
}) {
  return (
    <div className="mt-2 grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`dm-mono rounded-[5px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${goldmanPanelToneClass(
            summary.stateTone
          )}`}
        >
          {summary.stateLabel}
        </span>
        <span
          className={`dm-mono rounded-[5px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${goldmanPanelToneClass(
            summary.heartbeatTone
          )}`}
        >
          {summary.heartbeatLabel}
        </span>
        <span className="dm-mono rounded-[5px] border border-white/[0.08] bg-black/25 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#cfd3dd]">
          {summary.boundaryLabel}
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#5a5e69]">
            runtime state
          </div>
          <div className="mt-1 text-[10.5px] font-semibold leading-snug text-[#eceef2]">
            {summary.stateDetail}
          </div>
        </div>
        <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#5a5e69]">
            heartbeat
          </div>
          <div className="mt-1 text-[10.5px] font-semibold leading-snug text-[#eceef2]">
            {summary.heartbeatDetail}
          </div>
        </div>
        <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
          <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#5a5e69]">
            execution boundary
          </div>
          <div className="mt-1 text-[10.5px] font-semibold leading-snug text-[#eceef2]">
            {summary.boundaryDetail}
          </div>
        </div>
      </div>
      <div className="rounded-[8px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
        <div className="dm-mono text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#5a5e69]">
          next step
        </div>
        <div className="mt-1 text-[10.5px] font-semibold leading-snug text-[#eceef2]">
          {summary.actionDetail}
        </div>
      </div>
    </div>
  );
}
