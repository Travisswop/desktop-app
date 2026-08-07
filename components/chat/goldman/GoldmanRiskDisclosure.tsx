'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

// The chat dashboard wraps itself in a fixed z-99999 layer, so anything below
// that renders invisibly underneath it. A consent gate that silently fails to
// appear is the worst possible failure mode here.
const OVERLAY_Z = 'z-[100000]';

export type GoldmanRiskDisclosureProps = {
  open: boolean;
  version?: string | null;
  isAccepting?: boolean;
  onAccept: () => void;
  onDismiss: () => void;
};

/**
 * Blocking acknowledgement shown before Goldman may open any new exposure.
 *
 * Dismissible on purpose: the server holds the gate, so a user who closes this
 * simply can't start a strategy or fund a venue until they accept — they are
 * never locked out of the console, and never locked out of closing a position
 * they already hold.
 */
export function GoldmanRiskDisclosure({
  open,
  version,
  isAccepting = false,
  onAccept,
  onDismiss,
}: GoldmanRiskDisclosureProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${OVERLAY_Z} flex items-center justify-center bg-black/80 p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="goldman-risk-disclosure-title"
      data-testid="goldman-risk-disclosure"
    >
      <div className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-[14px] border border-[#f4c95d]/25 bg-[#0e1014] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-[#f4c95d]/30 bg-[#f4c95d]/10">
            <AlertTriangle className="h-4 w-4 text-[#f4c95d]" />
          </span>
          <div>
            <h2
              id="goldman-risk-disclosure-title"
              className="text-[15px] font-semibold leading-tight text-[#eceef2]"
            >
              Before Goldman trades for you
            </h2>
            <p className="dm-mono mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8f7c47]">
              Beta software · real money · read this
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-[12.5px] leading-relaxed text-[#c9cdd6]">
          <p>
            Goldman is an <strong className="text-[#eceef2]">experimental AI
            trading agent</strong> and is still in testing. Once you start a
            plan, it can place trades, move funds between venues, and open and
            close positions on its own, using real money in your vault.
          </p>
          <p>
            AI agents make mistakes. It can misread a market, size a position
            badly, act on stale or wrong data, or behave in ways neither you nor
            we predicted.{' '}
            <strong className="text-[#eceef2]">
              You can lose some or all of the funds in this vault.
            </strong>{' '}
            Leveraged perpetuals can be liquidated, and prediction markets can
            settle worthless.
          </p>
          <p>
            <strong className="text-[#eceef2]">
              Swop is not liable for any transaction the agent makes
            </strong>{' '}
            or for any losses, missed gains, fees, taxes, or damages that result
            from using it. Nothing here is financial, investment, legal, or tax
            advice, and no outcome is promised. Venues, networks, and third-party
            services can fail or delay independently of Swop.
          </p>
          <p>
            You stay in control: you can stop a plan, close positions, and
            withdraw at any time — none of which require this acknowledgement.
            Only fund the vault with money you can afford to lose.
          </p>
          <p className="text-[#9aa0ab]">
            Accepting confirms you have read this, that you understand the
            software is in testing, and that you accept these risks.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            data-testid="goldman-risk-disclosure-accept"
            disabled={isAccepting}
            onClick={onAccept}
            className="dm-btn dm-mono flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#3fe08f]/30 bg-[#3fe08f]/10 px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3fe08f] disabled:cursor-default disabled:opacity-50"
          >
            {isAccepting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            I understand and accept the risk
          </button>
          <button
            type="button"
            disabled={isAccepting}
            onClick={onDismiss}
            className="dm-btn dm-mono flex h-10 items-center justify-center rounded-[9px] border border-white/[0.07] bg-black/20 px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9396a0] disabled:cursor-default disabled:opacity-50"
          >
            Not now
          </button>
        </div>
        {version && (
          <p className="dm-mono mt-3 text-center text-[8.5px] uppercase tracking-[0.12em] text-[#5a5e69]">
            disclosure {version}
          </p>
        )}
      </div>
    </div>
  );
}
