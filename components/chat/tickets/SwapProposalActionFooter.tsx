import { ArrowRightLeft, Ban, Check, Loader2, RefreshCw } from 'lucide-react';

import type { SwapActionBlockerNotice } from '@/lib/chat/swapTicketBlockers';
import {
  TICKET_PRIMARY_BUTTON_CLASS,
  TICKET_REJECT_BUTTON_CLASS,
} from '@/lib/chat/ticketStyles';

type SwapProposalActionFooterProps = {
  actionLabel: string;
  canAct: boolean;
  isConfirmingSwap: boolean;
  isOpen: boolean;
  isPending: boolean;
  isPrimaryActionDisabled: boolean;
  isQuoteLoading: boolean;
  onConfirm: () => void;
  onReject: () => void;
  quoteOnly: boolean;
  status: string;
  swapActionBlocker: SwapActionBlockerNotice | null;
};

export function SwapProposalActionFooter({
  actionLabel,
  canAct,
  isConfirmingSwap,
  isOpen,
  isPending,
  isPrimaryActionDisabled,
  isQuoteLoading,
  onConfirm,
  onReject,
  quoteOnly,
  status,
  swapActionBlocker,
}: SwapProposalActionFooterProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPrimaryActionDisabled}
          className={TICKET_PRIMARY_BUTTON_CLASS}
        >
          {isQuoteLoading || isConfirmingSwap ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === 'approved' || status === 'executed' ? (
            <Check className="h-3.5 w-3.5" />
          ) : quoteOnly ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <ArrowRightLeft className="h-3.5 w-3.5" />
          )}
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={!canAct || isPending}
          className={TICKET_REJECT_BUTTON_CLASS}
        >
          <Ban className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>

      {swapActionBlocker && (
        <p
          className={`mt-2 rounded-[10px] border px-3 py-2 text-[11px] font-semibold ${
            swapActionBlocker.tone === 'warning'
              ? 'border-[#ffb14a]/25 bg-[#ffb14a]/10 text-[#ffd08a]'
              : 'border-[#3fe08f]/20 bg-[#3fe08f]/10 text-[#9ef7c8]'
          }`}
        >
          {swapActionBlocker.message}
        </p>
      )}
    </>
  );
}
