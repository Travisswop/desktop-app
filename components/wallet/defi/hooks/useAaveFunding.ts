'use client';

import { useCallback } from 'react';
import { ethers } from 'ethers';
import { useSendTransaction, useWallets } from '@privy-io/react-auth';
import { CHAIN_ID } from '@/types/wallet-types';
import type { AaveChain, AaveReserve } from '@/types/aave';
import { runSponsoredFirst } from '@/lib/wallet/gasSponsorship';
import {
  EVM_NATIVE_ADDRESS,
  WETH9_IFACE,
  sameAddress,
  wrappedNativeFor,
  type AaveFundingQuote,
  type AavePayToken,
} from '@/lib/defi/aaveFunding';
import { getAaveReadProvider, useAaveActions } from './useAaveActions';

const ERC20_IFACE = new ethers.Interface([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
]);

// How long to wait for converted funds before giving up. A same-chain swap
// lands in a block or two; a bridge usually settles inside a few minutes.
const SETTLE_TIMEOUT_MS = { sameChain: 120_000, crossChain: 480_000 };
const SETTLE_POLL_MS = 5_000;

// The pay token can live on a different chain than the Aave market, so reads
// and receipt waits must target the right RPC — not the market's.
const AAVE_CHAIN_BY_ID: Record<number, AaveChain> = {
  1: 'ethereum',
  137: 'polygon',
  8453: 'base',
  42161: 'arbitrum',
};

const providerForChainId = (chainId: number) => {
  const chain = AAVE_CHAIN_BY_ID[chainId];
  if (!chain) throw new Error('Unsupported EVM chain.');
  return getAaveReadProvider(chain);
};

export type AaveFundingStatus = (message: string) => void;

export function useAaveFunding() {
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const { execute } = useAaveActions();

  const readReserveBalance = useCallback(
    async (chain: AaveChain, asset: string, owner: string) => {
      const provider = getAaveReadProvider(chain);
      const token = new ethers.Contract(asset, ERC20_IFACE.fragments, provider);
      return (await token.balanceOf(owner)) as bigint;
    },
    [],
  );

  /** Privy signs on the wallet's active chain — move it to the source chain. */
  const ensureChain = useCallback(
    async (chainId: number, owner: string) => {
      const wallet = wallets.find((entry) =>
        sameAddress(entry.address, owner),
      );
      if (!wallet) return;
      if (wallet.chainId === `eip155:${chainId}`) return;
      await wallet.switchChain(chainId).catch(() => {
        // Embedded wallets switch implicitly on send; a failure here is only
        // fatal for injected wallets, which surface it on the send itself.
      });
    },
    [wallets],
  );

  const waitForReserveDelta = useCallback(
    async (
      chain: AaveChain,
      asset: string,
      owner: string,
      before: bigint,
      timeoutMs: number,
      onStatus?: AaveFundingStatus,
    ): Promise<bigint> => {
      const deadline = Date.now() + timeoutMs;
      let latest = before;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, SETTLE_POLL_MS));
        latest = await readReserveBalance(chain, asset, owner).catch(
          () => latest,
        );
        if (latest > before) return latest - before;
        onStatus?.('Waiting for the converted funds to land…');
      }
      return 0n;
    },
    [readReserveBalance],
  );

  /**
   * Convert (if needed) then supply/repay. Returns the hash of the Aave
   * transaction — the leg that actually moves the position.
   */
  const executeFunded = useCallback(
    async (params: {
      quote: AaveFundingQuote;
      mode: 'supply' | 'repay';
      payToken: AavePayToken;
      chain: AaveChain;
      poolAddress: string;
      reserve: AaveReserve;
      userAddress: string;
      isMax?: boolean;
      onStatus?: AaveFundingStatus;
    }): Promise<{ hash: string; suppliedAmount: number }> => {
      const {
        quote,
        mode,
        payToken,
        chain,
        poolAddress,
        reserve,
        userAddress,
        isMax,
        onStatus,
      } = params;

      if (quote.payTokenId !== payToken.id) {
        throw new Error(
          'The quote is for a different token — refresh and try again.',
        );
      }

      const targetChainId = CHAIN_ID[chain];

      const runAave = async (amount: bigint, full = false) => {
        onStatus?.(
          mode === 'supply' ? 'Supplying to Aave…' : 'Repaying on Aave…',
        );
        await ensureChain(targetChainId, userAddress);
        const { hash } = await execute(
          mode,
          {
            chain,
            poolAddress,
            reserve,
            userAddress,
            amount,
            isMax: full,
          },
          (step) =>
            onStatus?.(
              step === 'approving'
                ? `Approving ${reserve.symbol}…`
                : 'Confirm in wallet…',
            ),
        );
        return {
          hash,
          suppliedAmount: Number(
            ethers.formatUnits(amount, reserve.decimals),
          ),
        };
      };

      if (quote.route.kind === 'direct') {
        const amount = BigInt(quote.reserveAmountRaw || '0');
        if (amount <= 0n) throw new Error('Nothing to supply.');
        // uint256-max repay only makes sense with the debt token in hand.
        return runAave(amount, mode === 'repay' && !!isMax);
      }

      const before = await readReserveBalance(
        chain,
        reserve.asset,
        userAddress,
      ).catch(() => 0n);

      if (quote.route.kind === 'wrap') {
        const value = BigInt(quote.reserveAmountRaw || '0');
        if (value <= 0n) throw new Error('Nothing to wrap.');
        const wrapped = wrappedNativeFor(targetChainId);
        if (!wrapped) throw new Error('This chain has no wrapped native token.');
        onStatus?.(`Wrapping ${payToken.symbol} → ${reserve.symbol}…`);
        await ensureChain(targetChainId, userAddress);
        const wrapResult = await runSponsoredFirst(({ sponsor }) =>
          sendTransaction(
            {
              to: wrapped.address as `0x${string}`,
              data: WETH9_IFACE.encodeFunctionData(
                'deposit',
              ) as `0x${string}`,
              value,
              chainId: targetChainId,
            },
            { sponsor },
          ),
        );
        onStatus?.('Waiting for confirmation…');
        await getAaveReadProvider(chain)
          .waitForTransaction(wrapResult.hash, 1, 120_000)
          .catch(() => null);
        const after = await readReserveBalance(
          chain,
          reserve.asset,
          userAddress,
        ).catch(() => before + value);
        const delta = after > before ? after - before : value;
        return runAave(delta < value ? delta : value);
      }

      // ── Li.Fi route ──
      const { lifi, crossChain } = quote.route;
      const request = lifi.transactionRequest;
      if (!request?.to || !request?.data) {
        throw new Error('LI.FI did not return a transaction to execute.');
      }
      await ensureChain(payToken.chainId, userAddress);

      // Router allowance for ERC-20 sources.
      const approvalAddress = lifi.estimate?.approvalAddress;
      if (!payToken.isNative && approvalAddress) {
        const fromAmount = ethers.parseUnits(
          Number(quote.payAmount).toFixed(payToken.decimals),
          payToken.decimals,
        );
        const allowance = (await new ethers.Contract(
          payToken.address,
          ERC20_IFACE.fragments,
          providerForChainId(payToken.chainId),
        )
          .allowance(userAddress, approvalAddress)
          .catch(() => 0n)) as bigint;
        if (allowance < fromAmount) {
          onStatus?.(`Approving ${payToken.symbol}…`);
          const approveData = ERC20_IFACE.encodeFunctionData('approve', [
            approvalAddress,
            ethers.MaxUint256,
          ]);
          const approval = await runSponsoredFirst(({ sponsor }) =>
            sendTransaction(
              {
                to: payToken.address as `0x${string}`,
                data: approveData as `0x${string}`,
                chainId: payToken.chainId,
              },
              { sponsor },
            ),
          );
          onStatus?.('Waiting for approval…');
          await providerForChainId(payToken.chainId)
            .waitForTransaction(approval.hash, 1, 120_000)
            .catch(() => null);
        }
      }

      onStatus?.(`Converting ${payToken.symbol} → ${reserve.symbol}…`);
      let value = 0n;
      try {
        value = request.value ? BigInt(request.value) : 0n;
      } catch {
        value = 0n;
      }
      const swap = await runSponsoredFirst(({ sponsor }) =>
        sendTransaction(
          {
            to: request.to as `0x${string}`,
            data: request.data as `0x${string}`,
            value,
            chainId: payToken.chainId,
          },
          { sponsor },
        ),
      );

      // A returned hash is not a settled swap — a reverted source tx would
      // otherwise leave the user polling for funds that never move.
      onStatus?.('Waiting for confirmation…');
      const receipt = await providerForChainId(payToken.chainId)
        .waitForTransaction(swap.hash, 1, 180_000)
        .catch(() => null);
      if (receipt && receipt.status === 0) {
        throw new Error('The conversion failed on-chain (transaction reverted).');
      }

      onStatus?.('Waiting for the conversion to settle…');
      const delta = await waitForReserveDelta(
        chain,
        reserve.asset,
        userAddress,
        before,
        crossChain ? SETTLE_TIMEOUT_MS.crossChain : SETTLE_TIMEOUT_MS.sameChain,
        onStatus,
      );
      if (delta <= 0n) {
        throw new Error(
          `Your ${payToken.symbol} was converted, but the ${reserve.symbol} has not arrived yet. ` +
            `It is safe in your wallet — reopen ${mode === 'supply' ? 'Supply' : 'Repay'} and pay with ` +
            `${reserve.symbol} once it lands.`,
        );
      }
      return runAave(delta);
    },
    [
      ensureChain,
      execute,
      readReserveBalance,
      sendTransaction,
      waitForReserveDelta,
    ],
  );

  return { executeFunded, readReserveBalance };
}

export { EVM_NATIVE_ADDRESS };
