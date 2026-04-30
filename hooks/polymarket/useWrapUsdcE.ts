import { useState, useCallback } from 'react';
import {
  erc20Abi,
  encodeFunctionData,
  parseUnits,
  hexToBytes,
  bytesToHex,
} from 'viem';
import { polygon } from 'viem/chains';
import { useSendTransaction } from '@privy-io/react-auth';
import {
  usePolymarketWallet,
  useTrading,
} from '@/providers/polymarket';
import {
  LEGACY_USDC_E_ADDRESS,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';

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

const SAFE_ABI = [
  {
    name: 'nonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getTransactionHash',
    type: 'function',
    stateMutability: 'view',
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
      { name: '_nonce', type: 'uint256' },
    ],
    outputs: [{ type: 'bytes32' }],
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
  const { sendTransaction } = useSendTransaction();

  const [step, setStep] = useState<WrapStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const executeSafeTx = useCallback(
    async (
      to: `0x${string}`,
      calldata: `0x${string}`,
      nonce: bigint,
    ): Promise<`0x${string}`> => {
      if (!safeAddress || !eoaAddress || !walletClient || !publicClient)
        throw new Error('Wallet not ready');

      const safeTxHash = (await publicClient.readContract({
        address: safeAddress as `0x${string}`,
        abi: SAFE_ABI,
        functionName: 'getTransactionHash',
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
          nonce,
        ],
      })) as `0x${string}`;

      const txHashBytes = hexToBytes(safeTxHash);
      const signature = await walletClient.signMessage({
        account: eoaAddress as `0x${string}`,
        message: { raw: txHashBytes },
      });

      // Adjust v-byte +4 so Safe's checkSignatures uses eth_sign branch
      const sigBytes = hexToBytes(signature as `0x${string}`);
      sigBytes[64] = sigBytes[64] + 4;
      const packedSig = bytesToHex(sigBytes);

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
          packedSig as `0x${string}`,
        ],
      });

      const result = await sendTransaction({
        to: safeAddress as `0x${string}`,
        data: execCalldata,
        chainId: polygon.id,
      });

      return result.hash as `0x${string}`;
    },
    [safeAddress, eoaAddress, walletClient, publicClient, sendTransaction],
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

        // Read current Safe nonce
        const nonce = (await publicClient.readContract({
          address: safeAddress as `0x${string}`,
          abi: SAFE_ABI,
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
          abi: SAFE_ABI,
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
