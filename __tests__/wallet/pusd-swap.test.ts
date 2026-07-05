import { decodeFunctionData } from 'viem';
import {
  COLLATERAL_OFFRAMP_ADDRESS,
  COLLATERAL_ONRAMP_ADDRESS,
  POLYGON_USDCE_ADDRESS,
  PUSD_TOKEN_ADDRESS,
  buildRampUnwrapCall,
  buildRampWrapCall,
  isPolygonUsdceToken,
  isPusdSwapToken,
} from '@/lib/wallet/pusdSwap';

const WRAP_UNWRAP_ABI = [
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

const RECIPIENT = '0x1111111111111111111111111111111111111111';

describe('pUSD token predicates', () => {
  it('matches the curated pUSD token regardless of address casing', () => {
    expect(
      isPusdSwapToken({
        symbol: 'pUSD',
        address: PUSD_TOKEN_ADDRESS.toLowerCase(),
        chainId: '137',
      }),
    ).toBe(true);
    expect(
      isPusdSwapToken({
        symbol: 'pUSD',
        address: PUSD_TOKEN_ADDRESS,
        chain: 'POLYGON',
      }),
    ).toBe(true);
  });

  it('rejects the same address on a different chain', () => {
    expect(
      isPusdSwapToken({
        symbol: 'pUSD',
        address: PUSD_TOKEN_ADDRESS,
        chainId: '8453',
      }),
    ).toBe(false);
    expect(isPusdSwapToken(null)).toBe(false);
  });

  it('identifies Polygon USDC.e and not native Polygon USDC', () => {
    expect(
      isPolygonUsdceToken({
        symbol: 'USDC',
        address: POLYGON_USDCE_ADDRESS,
        chainId: 137,
      }),
    ).toBe(true);
    // Native USDC is paused on the ramps — it must never match.
    expect(
      isPolygonUsdceToken({
        symbol: 'USDC',
        address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        chainId: '137',
      }),
    ).toBe(false);
  });
});

describe('ramp calldata', () => {
  it('encodes wrap(USDC.e, recipient, amount) against the onramp', () => {
    const call = buildRampWrapCall(RECIPIENT, 1_500_000n);
    expect(call.to).toBe(COLLATERAL_ONRAMP_ADDRESS);
    const decoded = decodeFunctionData({
      abi: WRAP_UNWRAP_ABI,
      data: call.data,
    });
    expect(decoded.functionName).toBe('wrap');
    expect(decoded.args).toEqual([
      POLYGON_USDCE_ADDRESS,
      RECIPIENT,
      1_500_000n,
    ]);
  });

  it('encodes unwrap(USDC.e, recipient, amount) against the offramp', () => {
    const call = buildRampUnwrapCall(RECIPIENT, 250_000n);
    expect(call.to).toBe(COLLATERAL_OFFRAMP_ADDRESS);
    const decoded = decodeFunctionData({
      abi: WRAP_UNWRAP_ABI,
      data: call.data,
    });
    expect(decoded.functionName).toBe('unwrap');
    expect(decoded.args).toEqual([
      POLYGON_USDCE_ADDRESS,
      RECIPIENT,
      250_000n,
    ]);
  });
});
