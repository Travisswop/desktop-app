import { useState, useCallback } from 'react';
import {
  erc20Abi,
  encodeFunctionData,
  parseUnits,
} from 'viem';
import { polygon } from 'viem/chains';
import {
  usePolymarketWallet,
  useTrading,
} from '@/providers/polymarket';
import { useUser } from '@/lib/UserContext';
import {
  LEGACY_USDC_E_ADDRESS,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';
import { relayWrapExecTransaction } from '@/lib/polymarket/backend-session';

const COLLATERAL_ONRAMP_ADDRESS =
  '0x93070a847efEf7F70739046A929D47a521F5B8ee' as const;

const WRAP_ABI = [
  {
    name: 'wrap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_asset', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const SAFE_NONCE_ABI = [
  {
    name: 'nonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const GNOSIS_SAFE_EXEC_ABI = [
  {
    name: 'execTransaction',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
      { name: 'safeTxGas', type: 'uint256' },
      { name: 'baseGas', type: 'uint256' },
      { name: 'gasPrice', type: 'uint256' },
      { name: 'gasToken', type: 'address' },
      { name: 'refundReceiver', type: 'address' },
      { name: 'signatures', type: 'bytes' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const;

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

// EIP-712 types for Safe transaction — same structure used by useSafeDeployment
const SAFE_TX_TYPES = {
  SafeTx: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' },
    { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' },
    { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' },
    { name: 'refundReceiver', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export type WrapStep =
  | 'idle'
  | 'approving'
  | 'wrapping'
  | 'done'
  | 'error';

export function useWrapUsdcE() {
  const { publicClient, eoaAddress, walletClient } =
    usePolymarketWallet();
  const { safeAddress } = useTrading();
  const { accessToken } = useUser();

  const [step, setStep] = useState<WrapStep>('idle');
  const [error, setError] = useState<string | null>(null);

  // Signs a Safe transaction via EIP-712 signTypedData, encodes the
  // execTransaction calldata, then sends it to the backend relay endpoint.
  //
  // We CANNOT call walletClient.sendTransaction (or useSendTransaction) here
  // because Privy v3.18 routes eth_sendTransaction through SignRequestScreen
  // which crashes with "Cannot destructure property 'method' of 's.signMessage'
  // as it is undefined" — the screen tries to access signMessage.method but
  // that property only exists for sign requests, not transaction requests.
  //
  // The backend relay wallet pays gas and broadcasts the tx.  The Safe
  // verifies the user's EIP-712 signature on-chain — the relay wallet is
  // only the gas payer, not a signer for the Safe operation itself.
  const executeSafeTx = useCallback(
    async (
      to: `0x${string}`,
      calldata: `0x${string}`,
      nonce: bigint,
    ): Promise<`0x${string}`> => {
      if (!safeAddress || !eoaAddress || !walletClient || !publicClient || !accessToken)
        throw new Error('Wallet not ready');

      // Sign the SafeTx via EIP-712
      const signature = await walletClient.signTypedData({
        account: eoaAddress,
        domain: {
          chainId: polygon.id,
          verifyingContract: safeAddress as `0x${string}`,
        },
        types: SAFE_TX_TYPES,
        primaryType: 'SafeTx',
        message: {
          to,
          value: BigInt(0),
          data: calldata,
          operation: 0,
          safeTxGas: BigInt(0),
          baseGas: BigInt(0),
          gasPrice: BigInt(0),
          gasToken: ZERO_ADDRESS,
          refundReceiver: ZERO_ADDRESS,
          nonce,
        },
      });

      const execCalldata = encodeFunctionData({
        abi: GNOSIS_SAFE_EXEC_ABI,
        functionName: 'execTransaction',
        args: [
          to,
          BigInt(0),
          calldata,
          0,
          BigInt(0),
          BigInt(0),
          BigInt(0),
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          signature as `0x${string}`,
        ],
      });

      // Submit via backend relay — avoids Privy v3.18 SignRequestScreen crash
      const { txHash } = await relayWrapExecTransaction(
        safeAddress,
        execCalldata,
        accessToken,
      );

      return txHash;
    },
    [safeAddress, eoaAddress, walletClient, publicClient, accessToken],
  );

  const wrap = useCallback(
    async (amount: number) => {
      if (!safeAddress || !publicClient) return;

      setStep('approving');
      setError(null);

      try {
        const amountInWei = parseUnits(
          amount.toFixed(USDC_E_DECIMALS),
          USDC_E_DECIMALS,
        );

        const nonce = (await publicClient.readContract({
          address: safeAddress as `0x${string}`,
          abi: SAFE_NONCE_ABI,
          functionName: 'nonce',
        })) as bigint;

        // Step 1: approve CollateralOnramp to spend USDC.e from the Safe
        const approveCalldata = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [COLLATERAL_ONRAMP_ADDRESS, amountInWei],
        });

        const approveTxHash = await executeSafeTx(
          LEGACY_USDC_E_ADDRESS as `0x${string}`,
          approveCalldata,
          nonce,
        );

        await publicClient.waitForTransactionReceipt({
          hash: approveTxHash,
        });

        setStep('wrapping');

        // Re-read nonce after approve confirms
        const newNonce = (await publicClient.readContract({
          address: safeAddress as `0x${string}`,
          abi: SAFE_NONCE_ABI,
          functionName: 'nonce',
        })) as bigint;

        // Step 2: call wrap(USDC.e, safeAddress, amount) from the Safe
        const wrapCalldata = encodeFunctionData({
          abi: WRAP_ABI,
          functionName: 'wrap',
          args: [
            LEGACY_USDC_E_ADDRESS as `0x${string}`,
            safeAddress as `0x${string}`,
            amountInWei,
          ],
        });

        const wrapTxHash = await executeSafeTx(
          COLLATERAL_ONRAMP_ADDRESS,
          wrapCalldata,
          newNonce,
        );

        await publicClient.waitForTransactionReceipt({
          hash: wrapTxHash,
        });

        setStep('done');
      } catch (err: any) {
        const msg =
          err?.message || err?.toString() || 'Wrap failed';
        const isRejected = [
          'rejected',
          'denied',
          'cancelled',
          'user rejected',
        ].some((s) => msg.toLowerCase().includes(s));
        setError(isRejected ? 'Transaction was rejected.' : msg);
        setStep('error');
      }
    },
    [safeAddress, publicClient, executeSafeTx],
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
  }, []);

  return { wrap, step, error, reset };
}
