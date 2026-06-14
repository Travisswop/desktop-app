"use client";

import type { ReactNode } from "react";

/**
 * Visual tokens copied from components/chat/ChatArea.tsx so the onboarding
 * assistant looks exactly like the real Astro messenger (dark terminal theme,
 * DM-mono, green #3fe08f accent). Keep these in sync with ChatArea if its
 * agent styling changes.
 */
export const ASTRO_ACCENT = "#3fe08f";

export const AGENT_TERMINAL_BUBBLE_CLASS =
  "dm-mono rounded-[14px] border border-white/[0.07] bg-[#15171d] px-4 py-2.5 text-[13.5px] font-semibold leading-[1.7] text-[#a9adb8] shadow-[0_18px_50px_rgba(0,0,0,0.35)]";

export const USER_BUBBLE_CLASS =
  "dm-mono rounded-[14px] rounded-tr-[6px] border border-[#43e58f] bg-[#43e58f] px-4 py-2.5 text-[13.5px] font-semibold text-[#06120b] shadow-[0_18px_45px_rgba(63,224,143,0.16)]";

export const AGENT_PANEL_CLASS =
  "rounded-[16px] border border-white/[0.07] bg-gradient-to-b from-[#15171d] to-[#111318] text-[#eceef2] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)]";

export const TICKET_LABEL_CLASS =
  "dm-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]";

export const TICKET_FIELD_CLASS =
  "h-10 w-full rounded-[9px] border border-white/[0.07] bg-black px-3 text-[12.5px] font-semibold text-[#eceef2] outline-none placeholder:text-[#5a5e69] focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15 disabled:opacity-60";

export const PRIMARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#3fe08f] px-4 text-[13px] font-semibold text-[#031008] transition hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-50";

export const GHOST_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/[0.07] bg-[#101217] px-4 text-[13px] font-semibold text-[#eceef2] transition hover:bg-white/[0.05] disabled:opacity-50";

/** The "$_" Astro avatar tile from ChatArea (DmAgentTile). */
export function DmAgentTile({
  size = "h-[34px] w-[34px]",
  textClassName = "text-[12px]",
}: {
  size?: string;
  textClassName?: string;
}) {
  return (
    <div
      className={`dm-mono grid ${size} ${textClassName} place-items-center rounded-[10px] border border-[#3fe08f]/30 bg-black font-bold text-[#3fe08f] shadow-[inset_0_0_12px_rgba(63,224,143,0.09)]`}
    >
      $_
    </div>
  );
}

/** A single assistant ("Astro") text bubble, left-aligned with the tile. */
export function AstroBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <DmAgentTile />
      <div className={`${AGENT_TERMINAL_BUBBLE_CLASS} rounded-tl-md max-w-[82%]`}>
        {children}
      </div>
    </div>
  );
}

/** A single user text bubble, right-aligned. */
export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className={`${USER_BUBBLE_CLASS} max-w-[82%]`}>{children}</div>
    </div>
  );
}

/** Blinking terminal cursor appended while Astro is "typing". */
export function BlinkingCursor() {
  return (
    <span className="ml-0.5 inline-block w-[7px] animate-pulse text-[#3fe08f]">
      ▮
    </span>
  );
}

/** Astro "is typing" indicator: the tile + three pulsing dots. */
export function TypingDots() {
  return (
    <div className="flex items-end gap-2">
      <DmAgentTile />
      <div
        className={`${AGENT_TERMINAL_BUBBLE_CLASS} rounded-tl-md inline-flex items-center gap-1`}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#3fe08f]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Section label used inside cards (matches TICKET_LABEL_CLASS usage). */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className={`${TICKET_LABEL_CLASS} mb-1 block`}>{children}</label>;
}
