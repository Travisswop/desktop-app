import { useCallback } from 'react';
import type { WalletClient } from 'viem';
import { checkAllApprovals } from '@/lib/polymarket/approvals';
import { pmApi } from '@/lib/polymarket/polymarketApi';

export function useTokenApprovals() {
  const checkAllTokenApprovals = useCallback(async (safeAddress: string) => {
    try {
      return await checkAllApprovals(safeAddress);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to check approvals');
      throw error;
    }
  }, []);

  // Calls backend for SafeTx typed data, signs the safeTxHash with eth_sign,
  // then submits the signed approval batch to the relayer.
  const setAllTokenApprovals = useCallback(
    async (
      safeAddress: string,
      eoaAddress: string,
      walletClient: WalletClient,
    ): Promise<boolean> => {
      try {
        const result = await pmApi<{
          alreadyApproved?: boolean;
          typedData: any;
          safeTxHash: string;
          nonce: string;
          to: string;
          data: string;
          operation: number;
        }>(
          `/session/approval-typed-data?safeAddress=${safeAddress}&eoaAddress=${eoaAddress}`,
        );

        if (result.alreadyApproved) return true;

        // eth_sign the safeTxHash — backend uses splitAndPackSig (v +4)
        const signature = await walletClient.signMessage({
          message: { raw: result.safeTxHash as `0x${string}` },
        });

        const { approvalsComplete } = await pmApi<{
          approvalsComplete: boolean;
        }>('/session/approvals', {
          method: 'POST',
          body: JSON.stringify({
            safeAddress,
            eoaAddress,
            signature,
            nonce: result.nonce,
            to: result.to,
            data: result.data,
            operation: result.operation,
          }),
        });

        return approvalsComplete;
      } catch (err) {
        console.error('Failed to set all token approvals:', err);
        return false;
      }
    },
    [],
  );

  return { checkAllTokenApprovals, setAllTokenApprovals };
}
