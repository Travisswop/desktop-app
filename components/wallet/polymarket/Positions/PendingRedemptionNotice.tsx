'use client';

import { Clock3 } from 'lucide-react';

export type PendingRedemptionSnapshot = {
  asset: string;
  title: string;
  outcome: string;
  amount: number;
  txId?: string;
  submittedAt?: number;
};

export default function PendingRedemptionNotice({
  redemptions,
}: {
  redemptions: PendingRedemptionSnapshot[];
}) {
  if (!redemptions.length) return null;

  return (
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
                <span className="flex-shrink-0 font-semibold text-amber-900">
                  +${item.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
