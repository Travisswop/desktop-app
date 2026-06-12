'use client';

import { useState } from 'react';
import { Clock3, Share2 } from 'lucide-react';
import type { PolymarketPosition } from '@/hooks/polymarket';
import PositionShareModal from './PositionShareModal';

export type PendingRedemptionSnapshot = {
  asset: string;
  title: string;
  outcome: string;
  amount: number;
  txId?: string;
  submittedAt?: number;
  position?: PolymarketPosition;
};

export default function PendingRedemptionNotice({
  redemptions,
}: {
  redemptions: PendingRedemptionSnapshot[];
}) {
  const [shareRedemption, setShareRedemption] =
    useState<PendingRedemptionSnapshot | null>(null);

  if (!redemptions.length) return null;

  return (
    <>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock3 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Redemption submitted
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Your won position may leave the list while Polymarket settles the
              payout and the balance refreshes.
            </p>
            <div className="mt-2 space-y-1">
              {redemptions.map((item) => (
                <div
                  key={item.asset}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 truncate text-amber-900">
                    {item.title}
                    {item.outcome ? ` · ${item.outcome}` : ''}
                  </span>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="font-semibold text-amber-900">
                      +${item.amount.toFixed(2)}
                    </span>
                    {item.position && (
                      <button
                        onClick={() => setShareRedemption(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800 transition-colors hover:bg-amber-200"
                        title="Share redeemed prediction"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {shareRedemption?.position && (
        <PositionShareModal
          position={shareRedemption.position}
          isOpen={!!shareRedemption}
          onClose={() => setShareRedemption(null)}
          statusOverride="redeemed"
          redeemedAmount={shareRedemption.amount}
        />
      )}
    </>
  );
}
