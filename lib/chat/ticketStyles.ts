// Shared style constants for Astro chat panels and ticket components.

export const AGENT_PANEL_CLASS =
  'rounded-[16px] border border-white/[0.07] bg-gradient-to-b from-[#15171d] to-[#111318] text-[#eceef2] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)]';
export const TICKET_LABEL_CLASS =
  'dm-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]';
export const TICKET_FIELD_CLASS =
  'h-9 rounded-[9px] border border-white/[0.07] bg-black px-3 text-[12.5px] font-semibold text-[#eceef2] outline-none focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15 disabled:opacity-60';
export const TICKET_MONO_FIELD_CLASS =
  'dm-mono h-9 rounded-[9px] border border-white/[0.07] bg-black px-3 text-[13px] font-semibold text-[#eceef2] outline-none focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15 disabled:opacity-60';
export const TICKET_IDLE_BUTTON_CLASS =
  'border border-white/[0.07] bg-[#101217] text-[#eceef2] hover:bg-white/[0.05]';
export const TICKET_PRIMARY_BUTTON_CLASS =
  'dm-btn inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[11px] bg-[#3fe08f] px-3 text-[13px] font-bold text-[#031008] hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-50';
export const TICKET_REJECT_BUTTON_CLASS =
  'dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-white/[0.07] bg-black/20 px-3 text-[13px] font-semibold text-[#eceef2] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50';
