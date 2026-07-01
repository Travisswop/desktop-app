import { formatSwapAmount } from '@/lib/chat/ticketFormat';
import {
  TICKET_LABEL_CLASS,
  TICKET_PRIMARY_BUTTON_CLASS,
  TICKET_REJECT_BUTTON_CLASS,
} from '@/lib/chat/ticketStyles';
import { RefreshCw, X } from 'lucide-react';

type SwapBalanceRecoveryPanelProps = {
  availableAmount: string;
  canAct: boolean;
  isBusy: boolean;
  onKeepEditing: () => void;
  onRefreshQuote: () => void;
  previousAmountLabel: string;
  tokenSymbol: string;
};

export function SwapBalanceRecoveryPanel({
  availableAmount,
  canAct,
  isBusy,
  onKeepEditing,
  onRefreshQuote,
  previousAmountLabel,
  tokenSymbol,
}: SwapBalanceRecoveryPanelProps) {
  return (
    <div className="mt-3 rounded-[12px] border border-[#ffb14a]/25 bg-[#ffb14a]/10 px-3 py-3 text-[#ffe1ad]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#ffd08a]">
            swap recovery
          </div>
          <div className="mt-1 text-[12.5px] font-bold text-[#fff2d6]">
            Balance changed before signing
          </div>
        </div>
        <button
          type="button"
          onClick={onKeepEditing}
          className="dm-btn rounded-[8px] border border-[#ffb14a]/25 px-2 py-1 text-[10px] font-semibold text-[#ffd08a] hover:bg-[#ffb14a]/10"
        >
          Keep editing
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[10px] border border-[#ffb14a]/15 bg-black/20 px-3 py-2">
          <div className={TICKET_LABEL_CLASS}>requested</div>
          <div className="dm-mono mt-1 text-[12px] font-bold text-[#fff2d6]">
            {previousAmountLabel}
          </div>
        </div>
        <div className="rounded-[10px] border border-[#ffb14a]/15 bg-black/20 px-3 py-2">
          <div className={TICKET_LABEL_CLASS}>available now</div>
          <div className="dm-mono mt-1 text-[12px] font-bold text-[#ffd08a]">
            {formatSwapAmount(availableAmount)} {tokenSymbol}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-[#ffe1ad]">
        Astro kept this ticket open, reset the sell amount to your spendable
        balance, and invalidated the stale quote. Refresh the quote before
        signing again.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onRefreshQuote}
          disabled={!canAct || isBusy}
          className={TICKET_PRIMARY_BUTTON_CLASS}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh quote
        </button>
        <button
          type="button"
          onClick={onKeepEditing}
          className={TICKET_REJECT_BUTTON_CLASS}
        >
          <X className="h-3.5 w-3.5" />
          Keep editing
        </button>
      </div>
    </div>
  );
}
