import {
  getSwapActionBlocker,
  type SwapQuoteErrorKind,
} from '@/lib/chat/ticketFormat';

type SwapActionBlockerNoticeProps = {
  isVisible: boolean;
  canAct: boolean;
  fromToken: string;
  hasQuoteTokenOptions: boolean;
  hasSpendableBalance: boolean;
  hasValidSellAmount: boolean;
  amountExceedsBalance: boolean;
  payAmount: string;
  quoteStateStatus: 'idle' | 'loading' | 'success' | 'error';
  quoteStateErrorKind?: SwapQuoteErrorKind;
  selectedFromKey: string;
  selectedToKey: string;
};

export function SwapActionBlockerNotice(
  props: SwapActionBlockerNoticeProps
) {
  const { isVisible, ...blockerParams } = props;
  const blocker = getSwapActionBlocker(blockerParams);

  if (!isVisible || !blocker) {
    return null;
  }

  return (
    <p
      className={`mt-2 rounded-[10px] border px-3 py-2 text-[11px] font-semibold ${
        blocker.tone === 'info'
          ? 'border-[#3fe08f]/20 bg-[#3fe08f]/10 text-[#9ef7c8]'
          : 'border-[#ffb14a]/25 bg-[#ffb14a]/10 text-[#ffd08a]'
      }`}
    >
      {blocker.message}
    </p>
  );
}
