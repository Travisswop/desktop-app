'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as hl from '@nktkas/hyperliquid';
import { HL_IS_TESTNET, getHLApiUrl } from '@/services/hyperliquid/config';

const transport = new hl.HttpTransport({
  isTestnet: HL_IS_TESTNET,
  apiUrl: getHLApiUrl(HL_IS_TESTNET),
});
const infoClient = new hl.InfoClient({ transport });

// The `sendAsset` action identifies USDC by a network-specific token spec of
// the form "USDC:<tokenId>". Resolve it once from spotMeta (cached) so this
// works on both mainnet and testnet without hardcoding the id.
let usdcTokenSpecPromise: Promise<string> | null = null;
async function getUsdcTokenSpec(): Promise<string> {
  if (!usdcTokenSpecPromise) {
    usdcTokenSpecPromise = (async () => {
      const meta = await infoClient.spotMeta();
      const usdc = meta.tokens.find((t) => t.name === 'USDC');
      if (!usdc?.tokenId) {
        throw new Error('USDC token not found in spot metadata');
      }
      return `${usdc.name}:${usdc.tokenId}`;
    })().catch((err) => {
      usdcTokenSpecPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return usdcTokenSpecPromise;
}

// Normalize a user/derived amount into a clean decimal string for the API,
// avoiding float artifacts like "2.1500000000000004".
function toAmountString(amount: number): string {
  return amount.toFixed(6).replace(/\.?0+$/, '');
}

interface UseHyperliquidDexTransferArgs {
  /** Master-signed exchange client (from useHyperliquidAgent). Transfers move
   *  funds and must be signed by the master wallet — the agent cannot. */
  masterClient: hl.ExchangeClient | null;
  masterAddress: string | null;
}

/**
 * useHyperliquidDexTransfer
 *
 * Moves USDC collateral from the main USDC perp account into a builder-deployed
 * (HIP-3) perp DEX's isolated account via Hyperliquid's `sendAsset`, so the
 * user can trade markets on that DEX. Self-transfer only.
 */
export function useHyperliquidDexTransfer({
  masterClient,
  masterAddress,
}: UseHyperliquidDexTransferArgs) {
  const queryClient = useQueryClient();
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generic self-transfer of USDC collateral between two perp DEXs ('' = main).
  const move = useCallback(
    async (sourceDex: string, destinationDex: string, amountUsd: number) => {
      setError(null);
      if (!masterClient || !masterAddress) {
        throw new Error('Wallet not ready. Enable trading first.');
      }
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        throw new Error('Enter an amount greater than 0');
      }

      setIsTransferring(true);
      try {
        const token = await getUsdcTokenSpec();
        const result = await masterClient.sendAsset({
          destination: masterAddress as `0x${string}`,
          sourceDex: sourceDex.trim(),
          destinationDex: destinationDex.trim(),
          token,
          amount: toAmountString(amountUsd),
        });
        // Refresh main + per-DEX + aggregated portfolio balances. Invalidate
        // both query families so every perps surface reflects the move.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['hl-positions', masterAddress],
          }),
          queryClient.invalidateQueries({
            queryKey: ['hl-portfolio', masterAddress],
          }),
        ]);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transfer failed';
        setError(msg);
        throw err;
      } finally {
        setIsTransferring(false);
      }
    },
    [masterClient, masterAddress, queryClient],
  );

  // Main perp account → builder DEX (fund a trade).
  const transferToDex = useCallback(
    (destinationDex: string, amountUsd: number) => {
      if (!destinationDex.trim()) throw new Error('No builder DEX specified');
      return move('', destinationDex, amountUsd);
    },
    [move],
  );

  // Builder DEX → main perp account (sweep freed collateral back after close).
  const sweepDexToMain = useCallback(
    (sourceDex: string, amountUsd: number) => {
      if (!sourceDex.trim()) throw new Error('No builder DEX specified');
      return move(sourceDex, '', amountUsd);
    },
    [move],
  );

  return {
    transferToDex,
    sweepDexToMain,
    isTransferring,
    error,
    clearTransferError: () => setError(null),
  };
}
