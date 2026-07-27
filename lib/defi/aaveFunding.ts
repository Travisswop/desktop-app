// Funding an Aave supply/repay with any EVM token in the wallet.
//
// Aave v3 has no native-ETH reserve — the market lists WETH — so a user holding
// only ETH has a 0 balance against every reserve and cannot post collateral at
// all. This module quotes a route from whatever they hold into the reserve
// asset; useAaveFunding executes it.
//
// Route selection, cheapest first:
//   pay token IS the reserve     → supply directly, no conversion.
//   native coin → wrapped native → WETH/WPOL `deposit()` (exact 1:1, no fee,
//                                  no slippage) — the "supply ETH" case.
//   anything else                → Li.Fi swap into the reserve asset, paid to
//                                  the user's own wallet, then supply what
//                                  actually landed.
import { ethers } from 'ethers';
import { getLifiQuote } from '@/actions/lifiForTokenSwap';
import { CHAIN_ID } from '@/types/wallet-types';
import type { AaveChain, AaveReserve } from '@/types/aave';
import type { TokenData } from '@/types/token';

export const EVM_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

// Canonical wrapped-native ERC-20 per chain — the token Aave actually lists.
// All implement the WETH9 deposit()/withdraw() interface.
export const WRAPPED_NATIVE: Record<
  number,
  { address: string; native: string; wrapped: string }
> = {
  1: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    native: 'ETH',
    wrapped: 'WETH',
  },
  137: {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    native: 'POL',
    wrapped: 'WPOL',
  },
  8453: {
    address: '0x4200000000000000000000000000000000000006',
    native: 'ETH',
    wrapped: 'WETH',
  },
  42161: {
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    native: 'ETH',
    wrapped: 'WETH',
  },
};

export const WETH9_IFACE = new ethers.Interface([
  'function deposit() payable',
]);

export const sameAddress = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

export const wrappedNativeFor = (chainId: number) =>
  WRAPPED_NATIVE[chainId] ?? null;

export function reserveIsWrappedNative(
  chain: AaveChain,
  reserve: AaveReserve,
): boolean {
  const wrapped = wrappedNativeFor(CHAIN_ID[chain]);
  return !!wrapped && sameAddress(wrapped.address, reserve.asset);
}

/** A wallet token normalised for the Aave "Pay with" picker. */
export interface AavePayToken {
  id: string;
  symbol: string;
  name: string;
  /** Contract address, or the zero address for a native coin. */
  address: string;
  chainId: number;
  decimals: number;
  balance: number;
  rawAmount?: string;
  priceUsd: number;
  logoURI?: string;
  isNative: boolean;
}

const CHAIN_ID_BY_NAME: Record<string, number> = {
  ETHEREUM: 1,
  POLYGON: 137,
  BASE: 8453,
  ARBITRUM: 42161,
};

/**
 * Wallet tokens that can fund an Aave action. Solana is excluded: a Solana
 * source needs the swap modal's signing path, and a half-finished bridge would
 * leave the supply un-executed.
 */
export function toAavePayTokens(tokens: TokenData[]): AavePayToken[] {
  return tokens
    .map((token): AavePayToken | null => {
      const chainId =
        token.chainId ?? CHAIN_ID_BY_NAME[String(token.chain).toUpperCase()];
      if (!chainId || !WRAPPED_NATIVE[chainId]) return null;
      const balance = Number(token.balance);
      if (!Number.isFinite(balance) || balance <= 0) return null;
      const address = token.address || EVM_NATIVE_ADDRESS;
      const isNative =
        !token.address || sameAddress(token.address, EVM_NATIVE_ADDRESS);
      return {
        id: `${chainId}:${address.toLowerCase()}:${token.symbol}`,
        symbol: token.symbol,
        name: token.name,
        address,
        chainId,
        decimals: token.decimals ?? 18,
        balance,
        rawAmount: token.rawAmount,
        priceUsd: Number(token.marketData?.price ?? 0) || 0,
        logoURI: token.logoURI,
        isNative,
      };
    })
    .filter((token): token is AavePayToken => !!token)
    .sort((a, b) => b.balance * b.priceUsd - a.balance * a.priceUsd);
}

export interface LifiTransactionRequest {
  to?: string;
  data?: string;
  value?: string;
  chainId?: number;
}

export interface AaveLifiQuote {
  estimate?: {
    toAmount?: string;
    toAmountUSD?: string;
    approvalAddress?: string;
  };
  transactionRequest?: LifiTransactionRequest;
}

export type AaveFundingRoute =
  | { kind: 'direct' }
  | { kind: 'wrap' }
  | { kind: 'lifi'; lifi: AaveLifiQuote; crossChain: boolean };

export interface AaveFundingQuote {
  route: AaveFundingRoute;
  /** Echoed so execution can never spend a different token/amount. */
  payTokenId: string;
  payAmount: string;
  reserveAmount: number;
  reserveAmountUsd: number;
  /** Exact base units for the direct/wrap routes. */
  reserveAmountRaw: string;
}

export function describeAaveFundingRoute(
  quote: AaveFundingQuote,
  reserveSymbol: string,
): string {
  if (quote.route.kind === 'direct') return 'No conversion needed';
  if (quote.route.kind === 'wrap')
    return `Wrap to ${reserveSymbol} (1:1, no fee)`;
  return quote.route.crossChain ? 'Bridge + swap via LI.FI' : 'Swap via LI.FI';
}

const parseUnitsSafe = (amount: string | number, decimals: number): bigint => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return ethers.parseUnits(value.toFixed(decimals), decimals);
};

const rawToNumber = (raw: string | undefined, decimals: number) => {
  if (!raw) return 0;
  try {
    return Number(ethers.formatUnits(BigInt(raw), decimals));
  } catch {
    return 0;
  }
};

export async function getAaveFundingQuote(params: {
  payToken: AavePayToken;
  chain: AaveChain;
  reserve: AaveReserve;
  /** Human amount in the PAY token's units. */
  amount: string | number;
  slippageBps: number;
  userAddress: string;
}): Promise<AaveFundingQuote> {
  const { payToken, chain, reserve, amount, slippageBps, userAddress } = params;
  const targetChainId = CHAIN_ID[chain];
  const wrapped = wrappedNativeFor(targetChainId);
  const base = { payTokenId: payToken.id, payAmount: String(amount) };

  const onTargetChain = payToken.chainId === targetChainId;

  if (onTargetChain && sameAddress(payToken.address, reserve.asset)) {
    const raw = parseUnitsSafe(amount, reserve.decimals);
    const out = Number(ethers.formatUnits(raw, reserve.decimals));
    return {
      ...base,
      route: { kind: 'direct' },
      reserveAmount: out,
      reserveAmountUsd: out * reserve.priceUsd,
      reserveAmountRaw: raw.toString(),
    };
  }

  if (
    onTargetChain &&
    payToken.isNative &&
    !!wrapped &&
    sameAddress(wrapped.address, reserve.asset)
  ) {
    const raw = parseUnitsSafe(amount, reserve.decimals);
    const out = Number(ethers.formatUnits(raw, reserve.decimals));
    return {
      ...base,
      route: { kind: 'wrap' },
      reserveAmount: out,
      reserveAmountUsd: out * reserve.priceUsd,
      reserveAmountRaw: raw.toString(),
    };
  }

  const fromAmount = parseUnitsSafe(amount, payToken.decimals);
  if (fromAmount <= 0n) throw new Error('Enter an amount.');

  const result = await getLifiQuote({
    fromChain: String(payToken.chainId),
    toChain: String(targetChainId),
    fromToken: payToken.isNative ? EVM_NATIVE_ADDRESS : payToken.address,
    toToken: reserve.asset,
    // Swap into the user's OWN wallet — the Pool is funded by the follow-up
    // supply call, which needs an allowance no router can grant.
    fromAddress: userAddress,
    toAddress: userAddress,
    fromAmount: fromAmount.toString(),
    slippage: slippageBps / 10_000,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Unable to quote this conversion.');
  }

  const lifi = result.data as AaveLifiQuote;
  const out = rawToNumber(lifi.estimate?.toAmount, reserve.decimals);
  return {
    ...base,
    route: {
      kind: 'lifi',
      lifi,
      crossChain: payToken.chainId !== targetChainId,
    },
    reserveAmount: out,
    reserveAmountUsd:
      Number(lifi.estimate?.toAmountUSD) || out * reserve.priceUsd,
    reserveAmountRaw: lifi.estimate?.toAmount ?? '0',
  };
}
