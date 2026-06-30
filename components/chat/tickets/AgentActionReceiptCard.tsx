'use client';

// Receipt ("ticket") rendering for completed agent actions: token sends,
// swaps, and the generic stake/to-win layout used by prediction and perps
// orders. Extracted from ChatArea.tsx.

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  Send,
  Share2,
  X,
} from 'lucide-react';
import type { AgentActionCompletion } from '@/lib/chat/agentActionHandoff';
import {
  formatReceiptMoney,
  receiptTitle,
  receiptSubtitle,
  shareReceiptImage,
  shortReceiptHash,
} from '@/lib/chat/receiptShare';
import {
  formatCompactUsd,
  formatSwapAmount,
  formatWalletAddress,
} from '@/lib/chat/ticketFormat';
import { TICKET_LABEL_CLASS } from '@/lib/chat/ticketStyles';

export const TICKET_ACTION_BUTTON_BASE_CLASS =
  'dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] text-[13px]';
export const TICKET_ACTION_ACCENTS = {
  green: {
    share: `${TICKET_ACTION_BUTTON_BASE_CLASS} border border-[#3fe08f]/20 bg-[#3fe08f]/10 font-bold text-[#dfffee] hover:bg-[#3fe08f]/15 disabled:cursor-wait disabled:opacity-45`,
    view: `${TICKET_ACTION_BUTTON_BASE_CLASS} border border-[#3fe08f]/20 bg-[#3fe08f]/10 font-bold text-[#dfffee] hover:bg-[#3fe08f]/15 disabled:cursor-not-allowed disabled:opacity-45`,
  },
  blue: {
    share: `${TICKET_ACTION_BUTTON_BASE_CLASS} border border-[#4da3ff]/20 bg-[#4da3ff]/10 font-bold text-[#e3f1ff] hover:bg-[#4da3ff]/15 disabled:cursor-wait disabled:opacity-45`,
    view: `${TICKET_ACTION_BUTTON_BASE_CLASS} border border-[#4da3ff]/20 bg-[#4da3ff]/10 font-bold text-[#e3f1ff] hover:bg-[#4da3ff]/15 disabled:cursor-not-allowed disabled:opacity-45`,
  },
} as const;
export const TICKET_ACTION_VIEW_NEUTRAL_CLASS = `${TICKET_ACTION_BUTTON_BASE_CLASS} border border-white/[0.07] bg-[#111318] font-semibold text-[#eceef2] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45`;

export function TicketActions({
  receipt,
  onDone,
  isSharing,
  onShare,
  accent = 'green',
  neutralView = false,
  className = 'mt-3',
}: {
  receipt: AgentActionCompletion;
  onDone: () => void;
  isSharing: boolean;
  onShare: () => void;
  accent?: keyof typeof TICKET_ACTION_ACCENTS;
  neutralView?: boolean;
  className?: string;
}) {
  const canView = Boolean(receipt.txUrl);
  const styles = TICKET_ACTION_ACCENTS[accent];
  return (
    <div className={`${className} grid grid-cols-3 gap-2`}>
      <button
        type="button"
        onClick={onDone}
        className="dm-btn h-10 rounded-[11px] border border-white/[0.07] bg-[#111318] text-[13px] font-semibold text-[#9396a0] hover:bg-white/[0.04]"
      >
        Done
      </button>
      <button
        type="button"
        disabled={isSharing}
        onClick={onShare}
        className={styles.share}
      >
        {isSharing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Share2 className="h-3.5 w-3.5" />
        )}
        Share
      </button>
      <button
        type="button"
        disabled={!canView}
        onClick={() => {
          if (receipt.txUrl)
            window.open(receipt.txUrl, '_blank', 'noopener,noreferrer');
        }}
        className={neutralView ? TICKET_ACTION_VIEW_NEUTRAL_CLASS : styles.view}
      >
        {receipt.explorerLabel || (canView ? 'View tx' : 'No tx yet')}
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function TicketFooter({
  hash,
  label = 'self-custodied · settled through Swop',
}: {
  hash: string;
  label?: string;
}) {
  return (
    <div className="dm-mono mt-4 text-center text-[10px] font-semibold text-[#5a5e69]">
      {label} · {hash}
    </div>
  );
}

export function AgentActionReceiptCard({
  receipt,
  onDone,
}: {
  receipt: AgentActionCompletion;
  onDone: () => void;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const confirmed = receipt.status !== 'failed';
  const receiptExecution =
    receipt.executionResult && typeof receipt.executionResult === 'object'
      ? receipt.executionResult
      : {};
  const isSwapReceipt =
    receipt.provider === 'swop' &&
    (receipt.action === 'wallet.swap' ||
      receiptExecution.kind === 'swap' ||
      Boolean(receiptExecution.fromToken && receiptExecution.toToken));
  const isSendReceipt =
    !isSwapReceipt &&
    receipt.provider === 'swop' &&
    (receipt.action === 'wallet.send' ||
      receipt.action === 'transfer_token' ||
      receipt.action === 'transfer_sol' ||
      receiptExecution.kind === 'send' ||
      (Boolean(receiptExecution.recipient) &&
        !receiptExecution.fromToken &&
        !receiptExecution.toToken));
  const title = receiptTitle(receipt);
  const placedAt = receipt.placedAt
    ? new Date(receipt.placedAt)
    : new Date();
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const result = await shareReceiptImage(receipt);
      if (result === 'shared') {
        toast.success('Ticket ready to share.');
      } else if (result === 'copied') {
        toast.success('Ticket image copied. Paste it into your chat.');
      } else {
        toast.success('Ticket image downloaded.');
      }
    } catch (error) {
      console.error('Failed to share ticket image:', error);
      toast.error('Could not share this ticket image.');
    } finally {
      setIsSharing(false);
    }
  };
  const swapFromLabel = [
    receiptExecution.fromAmount,
    receiptExecution.fromToken,
  ]
    .filter(Boolean)
    .join(' ');
  const swapToLabel = [receiptExecution.toAmount, receiptExecution.toToken]
    .filter(Boolean)
    .join(' ');
  const swapRouteLabel =
    String(receiptExecution.routeLabel || receiptExecution.provider || '')
      .trim() || receiptSubtitle(receipt);

  if (isSendReceipt) {
    const sendTokenSymbol = String(
      receiptExecution.token || receipt.subject || 'TOKEN'
    ).toUpperCase();
    const sendNetwork = String(receiptExecution.network || '').toUpperCase();
    const sendRecipientAddress = String(
      receiptExecution.recipient || ''
    ).trim();
    const sendRecipientName =
      String(receiptExecution.recipientName || '').trim() ||
      (sendRecipientAddress
        ? formatWalletAddress(sendRecipientAddress)
        : 'recipient');
    const sendAmountLabel = (() => {
      const tokenAmount = receiptExecution.tokenAmount;
      if (tokenAmount !== undefined && tokenAmount !== null && tokenAmount !== '') {
        return `${formatSwapAmount(tokenAmount)} ${sendTokenSymbol}`;
      }
      const amount = receiptExecution.amount;
      if (amount !== undefined && amount !== null && amount !== '') {
        return receiptExecution.amountType === 'usd'
          ? `${formatCompactUsd(amount)} in ${sendTokenSymbol}`
          : `${formatSwapAmount(amount)} ${sendTokenSymbol}`;
      }
      return sendTokenSymbol;
    })();
    return (
      <div className="mt-2 w-full max-w-[460px] overflow-hidden rounded-[16px] border border-[#4da3ff]/25 bg-gradient-to-b from-[#15171d] to-[#111318] text-[#eceef2] shadow-[0_24px_70px_-34px_rgba(77,163,255,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] ${
                confirmed ? 'bg-[#4da3ff]/15' : 'bg-[#ff5d63]/15'
              }`}
            >
              {confirmed ? (
                <Send className="h-3.5 w-3.5 text-[#4da3ff]" />
              ) : (
                <X className="h-3.5 w-3.5 text-[#ffb2b6]" />
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-bold">
                {confirmed ? 'Transfer sent' : 'Transfer failed'}
              </div>
              <div className="dm-mono mt-0.5 truncate text-[10px] text-[#6f7380]">
                {receiptSubtitle(receipt)}
              </div>
            </div>
          </div>
          <span
            className={`dm-mono rounded-[6px] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
              confirmed
                ? 'bg-[#4da3ff]/10 text-[#a9d2ff]'
                : 'bg-[#ff5d63]/15 text-[#ffb2b6]'
            }`}
          >
            {confirmed ? 'sent' : 'failed'}
          </span>
        </div>

        <div className="border-l-2 border-[#4da3ff] px-4 py-4">
          <div className="rounded-[14px] border border-white/[0.07] bg-[#0f1116] p-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={TICKET_LABEL_CLASS}>you sent</div>
              <div className="dm-mono max-w-full truncate text-[22px] font-bold text-[#4da3ff]">
                {sendAmountLabel}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-[#4da3ff]/25 bg-[#4da3ff]/10 text-[#4da3ff]">
                <ArrowDown className="h-4 w-4" />
              </div>
              <div className={TICKET_LABEL_CLASS}>to</div>
              <div className="dm-mono max-w-full truncate text-[15px] font-bold text-[#eceef2]">
                {sendRecipientName}
              </div>
              {sendRecipientAddress && (
                <span className="dm-mono rounded-[8px] border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9396a0]">
                  {formatWalletAddress(sendRecipientAddress)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-[13px] border border-[#4da3ff]/15 bg-[#101217]">
            {([
              ['Network', sendNetwork || receiptSubtitle(receipt)],
              ['Token', sendTokenSymbol],
              ['Tx hash', shortReceiptHash(receipt) || 'pending'],
              [
                'Sent at',
                placedAt.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                }),
              ],
            ] as Array<[string, unknown]>).map(([label, value], index, rows) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 px-3 py-2 ${
                  index === rows.length - 1
                    ? ''
                    : 'border-b border-white/[0.06]'
                }`}
              >
                <span className="text-[11.5px] font-semibold text-[#6f7380]">
                  {label}
                </span>
                <span className="dm-mono min-w-0 truncate text-right text-[11.5px] font-bold text-[#eceef2]">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>

          {!confirmed && receipt.error && (
            <div className="mt-3 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2 text-[11px] font-semibold text-[#ffb2b6]">
              {String(receipt.error)}
            </div>
          )}

          <TicketActions
            receipt={receipt}
            onDone={onDone}
            isSharing={isSharing}
            onShare={() => void handleShare()}
            accent="blue"
          />

          <TicketFooter
            label="self-custodied · transferred through Swop"
            hash={shortReceiptHash(receipt) || 'audit logged'}
          />
        </div>
      </div>
    );
  }

  if (isSwapReceipt) {
    const networkLabel = [
      receiptExecution.fromChain,
      receiptExecution.toChain &&
      receiptExecution.toChain !== receiptExecution.fromChain
        ? receiptExecution.toChain
        : null,
    ]
      .filter(Boolean)
      .join(' to ');
    return (
      <div className="mt-2 w-full max-w-[460px] overflow-hidden rounded-[16px] border border-[#3fe08f]/25 bg-gradient-to-b from-[#15171d] to-[#111318] text-[#eceef2] shadow-[0_24px_70px_-34px_rgba(63,224,143,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] ${
                confirmed ? 'bg-[#3fe08f]/15' : 'bg-[#ff5d63]/15'
              }`}
            >
              {confirmed ? (
                <Check className="h-3.5 w-3.5 text-[#3fe08f]" />
              ) : (
                <X className="h-3.5 w-3.5 text-[#ffb2b6]" />
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-bold">
                {confirmed ? 'Swap submitted' : 'Swap failed'}
              </div>
              <div className="dm-mono mt-0.5 truncate text-[10px] text-[#6f7380]">
                {swapRouteLabel}
              </div>
            </div>
          </div>
          <span
            className={`dm-mono rounded-[6px] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
              confirmed
                ? 'bg-[#3fe08f]/10 text-[#9ef7c8]'
                : 'bg-[#ff5d63]/15 text-[#ffb2b6]'
            }`}
          >
            {confirmed ? 'confirmed' : 'failed'}
          </span>
        </div>

        <div className="border-l-2 border-[#3fe08f] px-4 py-4">
          <div className="rounded-[14px] border border-white/[0.07] bg-[#0f1116] p-3.5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0">
                <div className={TICKET_LABEL_CLASS}>you paid</div>
                <div className="dm-mono mt-1 truncate text-[17px] font-bold text-[#eceef2]">
                  {swapFromLabel || 'submitted'}
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#3fe08f]">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-right">
                <div className={TICKET_LABEL_CLASS}>you received</div>
                <div className="dm-mono mt-1 truncate text-[17px] font-bold text-[#3fe08f]">
                  {swapToLabel || 'quoted'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-[13px] border border-[#3fe08f]/15 bg-[#101217]">
            {([
              ['Route', swapRouteLabel],
              ['Network', networkLabel || receiptSubtitle(receipt)],
              ['Price', receiptExecution.price || '--'],
              ['Impact', receiptExecution.priceImpact || '--'],
              ['Fee', receiptExecution.fee || '--'],
              ['Tx hash', shortReceiptHash(receipt) || 'pending'],
            ] as Array<[string, unknown]>).map(([label, value], index, rows) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 px-3 py-2 ${
                  index === rows.length - 1
                    ? ''
                    : 'border-b border-white/[0.06]'
                }`}
              >
                <span className="text-[11.5px] font-semibold text-[#6f7380]">
                  {label}
                </span>
                <span className="dm-mono min-w-0 truncate text-right text-[11.5px] font-bold text-[#eceef2]">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>

          {!confirmed && receipt.error && (
            <div className="mt-3 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2 text-[11px] font-semibold text-[#ffb2b6]">
              {String(receipt.error)}
            </div>
          )}

          <TicketActions
            receipt={receipt}
            onDone={onDone}
            isSharing={isSharing}
            onShare={() => void handleShare()}
            accent="green"
          />

          <TicketFooter hash={shortReceiptHash(receipt) || 'audit logged'} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[18px] border border-[#3fe08f]/20 bg-[#15171d] text-[#eceef2] shadow-[0_24px_70px_-36px_rgba(63,224,143,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="dm-mono flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
          <Check className="h-3.5 w-3.5" />
          <span className="truncate">
            Ticket · {confirmed ? 'confirmed' : 'failed'}
          </span>
        </div>
        <div className="dm-mono max-w-[120px] truncate text-[10px] text-[#5a5e69]">
          {shortReceiptHash(receipt)}
        </div>
      </div>

      <div className="border-l-2 border-[#3fe08f] px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-[18px] font-bold tracking-[-0.02em]">
              {title}
            </div>
            <div className="dm-mono mt-1 truncate text-[11px] font-semibold text-[#6f7380]">
              {receiptSubtitle(receipt)}
            </div>
          </div>
          {receipt.toWin !== undefined && (
            <div className="dm-mono shrink-0 text-right text-[24px] font-bold text-[#3fe08f]">
              {formatReceiptMoney(receipt.toWin)}
            </div>
          )}
        </div>

        <div className="my-4 h-px bg-white/[0.07]" />

        {isSwapReceipt ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className={TICKET_LABEL_CLASS}>you paid</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {swapFromLabel || 'submitted'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>you received</div>
              <div className="dm-mono mt-1 text-[15px] font-bold text-[#3fe08f]">
                {swapToLabel || 'quoted'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>route</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {swapRouteLabel}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>placed</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {placedAt.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className={TICKET_LABEL_CLASS}>stake</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {formatReceiptMoney(receipt.stake)}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>to win</div>
              <div className="dm-mono mt-1 text-[15px] font-bold text-[#3fe08f]">
                {receipt.toWin !== undefined
                  ? formatReceiptMoney(receipt.toWin)
                  : 'settled'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>payout</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {receipt.payout !== undefined
                  ? formatReceiptMoney(receipt.payout)
                  : 'n/a'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>placed</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {placedAt.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
          </div>
        )}

        <TicketActions
          receipt={receipt}
          onDone={onDone}
          isSharing={isSharing}
          onShare={() => void handleShare()}
          accent="green"
          neutralView
          className="mt-5"
        />

        <TicketFooter hash={shortReceiptHash(receipt) || 'audit logged'} />
      </div>
    </div>
  );
}
