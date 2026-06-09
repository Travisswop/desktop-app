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

  const transferToDex = useCallback(
    async (destinationDex: string, amountUsd: number) => {
      setError(null);
      const dex = destinationDex.trim();
      if (!dex) throw new Error('No builder DEX specified');
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
          sourceDex: '', // main USDC perp DEX
          destinationDex: dex,
          token,
          amount: toAmountString(amountUsd),
        });
        // Refresh both the main and per-DEX account balances. Partial-match on
        // the shared prefix covers every ['hl-positions', master, *] query.
        await queryClient.invalidateQueries({
          queryKey: ['hl-positions', masterAddress],
        });
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

  return { transferToDex, isTransferring, error, clearTransferError: () => setError(null) };
}
