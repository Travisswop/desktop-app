import { useCallback } from "react";
import { useUser } from "@/lib/UserContext";
import { usePolymarketWallet } from "@/providers/polymarket";
import { checkAllApprovals } from "@/lib/polymarket/approvals";
import {
  getApprovalTypedData,
  submitApprovalSignature,
} from "@/lib/polymarket/backend-session";
import { hexToBytes } from "viem";

/**
 * Manages token approval checks and submissions for Polymarket trading.
 *
 * Replaces the previous relayClient.execute() SDK pattern with an explicit
 * two-step flow routed through the polymarket-backend:
 *   1. GET /session/approval-typed-data — backend builds and returns the
 *      SafeTx EIP-712 payload (or { alreadyApproved: true } if nothing to do)
 *   2. Wallet signs the SafeTx hash (one prompt, first time only)
 *   3. POST /session/approvals          — backend submits to Polymarket relayer
 *
 * ⚠️  PROTOCOL REQUIREMENT — The SafeTx EIP-712 signature MUST come from the
 *     Safe owner's EOA.  Polymarket's relayer verifies this on-chain.
 *     This signing step cannot be moved server-side and is a first-time-only
 *     operation (on-chain approvals persist forever).
 */
export function useTokenApprovals() {
  const { walletClient } = usePolymarketWallet();
  const { accessToken } = useUser();

  const checkAllTokenApprovals = useCallback(async (safeAddress: string) => {
    try {
      return await checkAllApprovals(safeAddress);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to check approvals");
    }
  }, []);

  /**
   * Sets all required token approvals via the polymarket-backend.
   * Returns true when approvals are complete (either already set or just submitted).
   *
   * ⚠️  One signing prompt on first call — see module docstring.
   */
  const setAllTokenApprovals = useCallback(
    async (safeAddress: string, eoaAddress: string): Promise<boolean> => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      if (!accessToken) {
        throw new Error("Not authenticated — cannot reach polymarket backend");
      }

      // Backend checks on-chain approval status and builds the SafeTx payload
      const approvalData = await getApprovalTypedData(
        safeAddress,
        eoaAddress,
        accessToken
      );

      if (approvalData.alreadyApproved) {
        return true;
      }

      if (
        !approvalData.txHash ||
        !approvalData.nonce ||
        !approvalData.to ||
        !approvalData.data
      ) {
        throw new Error("Backend returned incomplete approval typed data");
      }

      // The backend returns txHash = hashMessage(safeTxHash).
      // Sign the raw safeTxHash bytes so that signMessage (which prepends the
      // Ethereum prefix) produces: sign(hashMessage(safeTxHash)) = sign(txHash).
      // This matches the signature format expected by splitAndPackSig on the backend.
      //
      // ⚠️  CLIENT-SIDE SIGNING REQUIRED — Polymarket's relayer verifies this
      // signature against the Safe owner's EOA (eoaAddress). Cannot be server-side.
      const safeTxHashBytes = hexToBytes(approvalData.txHash as `0x${string}`);
      const signature = await walletClient.signMessage({
        account: eoaAddress as `0x${string}`,
        message: { raw: safeTxHashBytes },
      });

      const result = await submitApprovalSignature(
        {
          safeAddress,
          eoaAddress,
          signature,
          nonce: approvalData.nonce,
          to: approvalData.to,
          data: approvalData.data,
          operation: approvalData.operation,
        },
        accessToken
      );

      return result.approvalsComplete;
    },
    [walletClient, accessToken]
  );

  return {
    checkAllTokenApprovals,
    setAllTokenApprovals,
  };
}
