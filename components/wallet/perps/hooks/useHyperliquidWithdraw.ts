'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';

interface UseHyperliquidWithdrawArgs {
  /** Master-signed exchange client. Hyperliquid withdrawals cannot be signed by
   *  the local agent key. */
  masterClient: hl.ExchangeClient | null;
  masterAddress: string | null;
  ensureMasterClient?: () => Promise<hl.ExchangeClient | null>;
}

interface WithdrawArgs {
  destination: string;
  amountUsd: number;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function toAmountString(amount: number): string {
  return amount.toFixed(6).replace(/\.?0+$/, '');
}

export function useHyperliquidWithdraw({
  masterClient,
  masterAddress,
  ensureMasterClient,
}: UseHyperliquidWithdrawArgs) {
  const queryClient = useQueryClient();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(
    async ({ destination, amountUsd }: WithdrawArgs) => {
      setError(null);

      const signingClient = masterClient ?? (await ensureMasterClient?.()) ?? null;
      if (!signingClient || !masterAddress) {
        throw new Error('Perps wallet is not ready. Enable trading first.');
      }

      if (!EVM_ADDRESS_RE.test(destination)) {
        throw new Error('Choose a valid EVM destination address.');
      }

      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        throw new Error('Enter an amount greater than 0.');
      }

      setIsWithdrawing(true);
      try {
        const result = await signingClient.withdraw3({
          destination: destination as `0x${string}`,
          amount: toAmountString(amountUsd),
        });

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['hl-positions', masterAddress],
          }),
          queryClient.invalidateQueries({
            queryKey: ['hl-portfolio', masterAddress],
          }),
        ]);

        window.setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ['hl-positions', masterAddress],
          });
          queryClient.invalidateQueries({
            queryKey: ['hl-portfolio', masterAddress],
          });
        }, 5000);

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Withdrawal failed.';
        setError(message);
        throw err;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [ensureMasterClient, masterAddress, masterClient, queryClient],
  );

  return {
    withdraw,
    isWithdrawing,
    error,
    clearWithdrawError: () => setError(null),
  };
}
