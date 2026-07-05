// pUSD (Polymarket USD) swap routing helpers.
//
// pUSD is minted/redeemed 1:1 against legacy USDC.e through Polymarket's
// permissionless CollateralOnramp / CollateralOfframp contracts on Polygon
// (native USDC is currently paused on both ramps, so USDC.e is the only
// viable leg). Li.Fi routes pUSD directly on EVM lanes (verified Jul 2026)
// but has NO lane into pUSD from Solana — so the swap modal uses these
// helpers in two cases:
//
//   Polygon USDC.e ↔ pUSD : pure 1:1 wrap/unwrap — cheaper than Li.Fi, which
//                           charges the integrator fee on the same peg hop.
//   Li.Fi has no route    : composed fallback (e.g. Solana USDC → pUSD):
//     any token → pUSD    : Li.Fi route to Polygon USDC.e → onramp.wrap()
//     pUSD → any token    : offramp.unwrap() → Li.Fi route from Polygon USDC.e
//
// This is a plain wallet-to-wallet conversion — it does NOT touch Polymarket
// deposit wallets, Safes, or the predictions relayer (those flows live in
// hooks/polymarket/*). Ported from Expo-Moon-App src/lib/pusdSwap.ts.
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  fallback,
  http,
  type Hex,
} from 'viem';
import { polygon } from 'viem/chains';
import {
  COLLATERAL_OFFRAMP_ADDRESS,
  COLLATERAL_ONRAMP_ADDRESS,
  LEGACY_USDC_E_ADDRESS,
  POLYGON_RPC_URLS,
  USDC_E_CONTRACT_ADDRESS,
} from '@/constants/polymarket';

// constants/polymarket names pUSD "USDC_E_CONTRACT_ADDRESS" for legacy
// predictions reasons — re-export under unambiguous names for swap code.
export const PUSD_TOKEN_ADDRESS: string = USDC_E_CONTRACT_ADDRESS;
export const POLYGON_USDCE_ADDRESS: string = LEGACY_USDC_E_ADDRESS;
export { COLLATERAL_ONRAMP_ADDRESS, COLLATERAL_OFFRAMP_ADDRESS };

export const POLYGON_CHAIN_ID = 137;
export const PUSD_DECIMALS = 6;

const ONRAMP_ABI = [
  {
    type: 'function',
    name: 'wrap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_asset', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const OFFRAMP_ABI = [
  {
    type: 'function',
    name: 'unwrap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_asset', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const isPolygonChainToken = (token: any): boolean =>
  String(token?.chainId ?? '') === String(POLYGON_CHAIN_ID) ||
  token?.chain?.toUpperCase?.() === 'POLYGON' ||
  token?.network?.toUpperCase?.() === 'POLYGON';

const tokenAddressMatches = (token: any, address: string): boolean =>
  String(token?.address || '')
    .trim()
    .toLowerCase() === address.toLowerCase();

export const isPusdSwapToken = (token: any): boolean =>
  !!token &&
  isPolygonChainToken(token) &&
  tokenAddressMatches(token, PUSD_TOKEN_ADDRESS);

export const isPolygonUsdceToken = (token: any): boolean =>
  !!token &&
  isPolygonChainToken(token) &&
  tokenAddressMatches(token, POLYGON_USDCE_ADDRESS);

export interface PusdSwapQuote {
  direction: 'to-pusd' | 'from-pusd';
  // Raw 6-decimal amount entering the ramp: the USDC.e being wrapped (to-pusd,
  // known only after the Li.Fi leg when there is one) or the pUSD being
  // unwrapped (from-pusd).
  rampAmountRaw: string;
  // Expected output as a decimal amount in the receive token's units.
  toAmount: number;
  toAmountUsd: number;
  // The Li.Fi leg quote when the non-pUSD side isn't Polygon USDC.e.
  lifi?: any;
  // 0 for the pure ramp hop; the Li.Fi integrator fee bps when composed.
  swopPlatformFeeBps: number;
}

export const getPolygonPublicClient = () =>
  createPublicClient({
    chain: polygon,
    transport: fallback(POLYGON_RPC_URLS.map((url: string) => http(url))),
  });

export const readPolygonErc20Balance = async (
  tokenAddress: string,
  owner: string,
): Promise<bigint> =>
  getPolygonPublicClient().readContract({
    address: tokenAddress as Hex,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner as Hex],
  });

export const readPolygonErc20Allowance = async (
  tokenAddress: string,
  owner: string,
  spender: string,
): Promise<bigint> =>
  getPolygonPublicClient().readContract({
    address: tokenAddress as Hex,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner as Hex, spender as Hex],
  });

// Wait for a Polygon tx and REQUIRE on-chain success. viem returns reverted
// receipts rather than throwing, and a missing/unverifiable receipt must stop
// the flow too — every caller here is a step whose successor would otherwise
// spend funds the failed step never produced.
export const requirePolygonTxSuccess = async (
  hash: string,
  label: string,
  timeoutMs = 180_000,
) => {
  const receipt = await getPolygonPublicClient()
    .waitForTransactionReceipt({
      hash: hash as Hex,
      timeout: timeoutMs,
    })
    .catch(() => null);
  if (!receipt) {
    throw new Error(
      `${label} was submitted (${hash}) but could not be confirmed. Check the transaction on Polygonscan before retrying.`,
    );
  }
  if (receipt.status !== 'success') {
    throw new Error(`${label} failed on-chain (transaction reverted).`);
  }
};

// Poll until `spender`'s allowance from `owner` covers `minAllowance`. Used
// after submitting an approval whose confirmation the wallet path may not
// await — the follow-up ramp call's gas estimation fails against
// pre-approval state otherwise. Resolves immediately if already sufficient.
export const waitForPolygonAllowance = async (params: {
  tokenAddress: string;
  owner: string;
  spender: string;
  minAllowance: bigint;
  timeoutMs?: number;
}): Promise<void> => {
  const timeoutMs = params.timeoutMs ?? 120_000;
  const started = Date.now();
  for (;;) {
    const allowance = await readPolygonErc20Allowance(
      params.tokenAddress,
      params.owner,
      params.spender,
    ).catch(() => null);
    if (allowance !== null && allowance >= params.minAllowance) return;
    if (Date.now() - started > timeoutMs) {
      throw new Error(
        'The token approval has not confirmed on Polygon yet. No USDC.e or pUSD was converted — wait a moment and try again.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
};

// Poll the owner's USDC.e balance until it grows by ~the Li.Fi leg's expected
// output (bridges deliver minutes after the source tx). Returns the observed
// delta. Throws on timeout — at that point the user's funds are sitting as
// USDC.e in their own wallet, nothing is lost.
export const waitForUsdceArrival = async (params: {
  owner: string;
  baseline: bigint;
  minDelta: bigint;
  timeoutMs: number;
  onStatus?: (message: string) => void;
}): Promise<bigint> => {
  const started = Date.now();
  let lastStatus = 0;
  for (;;) {
    const balance = await readPolygonErc20Balance(
      POLYGON_USDCE_ADDRESS,
      params.owner,
    ).catch(() => null);
    if (balance !== null) {
      const delta = balance - params.baseline;
      if (delta >= params.minDelta) return delta;
    }
    if (Date.now() - started > params.timeoutMs) {
      throw new Error(
        'The swap into USDC.e was submitted, but the funds have not shown up on Polygon yet. No pUSD was minted. If the swap completed, your balance is in USDC.e on Polygon — you can swap USDC.e → pUSD directly once it lands.',
      );
    }
    if (Date.now() - lastStatus > 15_000) {
      params.onStatus?.('Waiting for funds to arrive on Polygon…');
      lastStatus = Date.now();
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
};

export const buildRampWrapCall = (recipient: string, amountRaw: bigint) => ({
  to: COLLATERAL_ONRAMP_ADDRESS as string,
  data: encodeFunctionData({
    abi: ONRAMP_ABI,
    functionName: 'wrap',
    args: [POLYGON_USDCE_ADDRESS as Hex, recipient as Hex, amountRaw],
  }),
});

export const buildRampUnwrapCall = (recipient: string, amountRaw: bigint) => ({
  to: COLLATERAL_OFFRAMP_ADDRESS as string,
  data: encodeFunctionData({
    abi: OFFRAMP_ABI,
    functionName: 'unwrap',
    args: [POLYGON_USDCE_ADDRESS as Hex, recipient as Hex, amountRaw],
  }),
});
