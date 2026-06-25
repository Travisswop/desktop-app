import {
  calculateCheckoutTokenAmount,
  formatRawTokenAmount,
  getEvmTokenAddressForCheckout,
  getLifiTokenAddressForCheckout,
  getProtectedCheckoutOutputRawAmount,
  getSlippageProtectedMultiplier,
  NATIVE_EVM_TOKEN_ADDRESS,
} from '@/lib/checkout-payment-amounts';
import type { CheckoutIntent } from '@/lib/checkout-api';
import type { TokenData } from '@/types/token';

const baseIntent = {
  intentId: 'co_test',
  status: 'active',
  description: 'Checkout',
  amount: {
    value: 0.1,
    currency: 'USDC',
  },
  fees: {
    currency: 'USDC',
    merchantReceivesAmount: 0.1,
    platformFeeBps: 50,
    platformFeeAmount: 0.0005,
    slippageBps: 50,
    totalDueAmount: 0.1005,
  },
  merchantCurrency: {
    symbol: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  merchant: {
    name: 'Astro Swop',
    wallet: {
      address: 'merchant-wallet',
    },
  },
  checkoutUrl: 'http://localhost:3000/checkout/co_test',
  expiresAt: '2026-06-05T20:00:00.000Z',
  createdAt: '2026-06-05T19:00:00.000Z',
  updatedAt: '2026-06-05T19:00:00.000Z',
} as CheckoutIntent;

function token(overrides: Partial<TokenData>): TokenData {
  return {
    name: 'Swop',
    symbol: 'SWOP',
    balance: '1000',
    decimals: 9,
    chain: 'SOLANA',
    address: 'SWOPMint11111111111111111111111111111111111',
    logoURI: '',
    marketData: {
      price: '0.006195',
    },
    timeSeriesData: {
      '1H': [],
      '1D': [],
      '1W': [],
      '1M': [],
      '1Y': [],
    },
    ...overrides,
  };
}

describe('checkout payment amounts', () => {
  it('uses inverse slippage so minimum payout still covers total due', () => {
    expect(getSlippageProtectedMultiplier(50)).toBeCloseTo(1 / 0.995);
  });

  it('adds enough Solana token input to offset post-slippage payout loss', () => {
    const amount = calculateCheckoutTokenAmount(baseIntent, token({}));
    const quotedOutput = Number(amount) * Number(token({}).marketData?.price);
    const minOutput = quotedOutput * (1 - 50 / 10000);

    expect(amount).toBe('16.30428170');
    expect(minOutput).toBeGreaterThanOrEqual(baseIntent.fees!.totalDueAmount);
  });

  it('leaves native Solana USDC checkout payments exact', () => {
    const amount = calculateCheckoutTokenAmount(
      baseIntent,
      token({
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        marketData: {
          price: '1',
        },
      })
    );

    expect(amount).toBe('0.100500');
  });

  it('keeps Solana USDC payments exact even without a market price feed', () => {
    const amount = calculateCheckoutTokenAmount(
      baseIntent,
      token({
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        marketData: null,
      })
    );

    expect(amount).toBe('0.100500');
  });

  it('does not skew Solana USDC payments by a depegged price feed', () => {
    const amount = calculateCheckoutTokenAmount(
      baseIntent,
      token({
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        marketData: {
          price: '0.9998',
        },
      })
    );

    expect(amount).toBe('0.100500');
  });

  it('leaves EVM USDC checkout payments exact even when price feeds drift', () => {
    const amount = calculateCheckoutTokenAmount(
      baseIntent,
      token({
        name: 'USD Coin',
        symbol: 'USDC',
        chain: 'POLYGON',
        decimals: 6,
        address: null,
        walletAddress: '0xf76ec7cf74bd7a3c53cb2bf8c8c625ed59bf6168',
        marketData: {
          price: '0.999704',
        },
      })
    );

    expect(amount).toBe('0.100500');
  });

  it('adds a dust buffer for one-cent pUSD LiFi checkout payments', () => {
    const oneCentIntent = {
      ...baseIntent,
      amount: {
        value: 0.01,
        currency: 'USDC',
      },
      fees: {
        currency: 'USDC',
        merchantReceivesAmount: 0.01,
        platformFeeBps: 50,
        platformFeeAmount: 0.015,
        slippageBps: 50,
        totalDueAmount: 0.025,
      },
    } as CheckoutIntent;
    const amount = calculateCheckoutTokenAmount(
      oneCentIntent,
      token({
        name: 'Polymarket USD',
        symbol: 'pUSD',
        chain: 'POLYGON',
        decimals: 6,
        address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
        walletAddress: '0xf76ec7cf74bd7a3c53cb2bf8c8c625ed59bf6168',
        marketData: {
          price: '0.999977',
        },
      })
    );

    expect(amount).toBe('0.025335');
  });

  it('returns no price-based estimate for unpriced non-USDC tokens', () => {
    // These tokens are sized by a live Jupiter ExactOut quote instead.
    const amount = calculateCheckoutTokenAmount(
      baseIntent,
      token({ marketData: null })
    );

    expect(amount).toBe('');
  });

  it('targets enough USDC output before slippage for Jupiter ExactOut quotes', () => {
    expect(getProtectedCheckoutOutputRawAmount(baseIntent)).toBe('101006');
  });

  it('formats Jupiter raw input amounts without losing token precision', () => {
    expect(formatRawTokenAmount('16627501978', 9)).toBe('16.627501978');
  });

  it('resolves known EVM USDC contracts even when portfolio data omits the token address', () => {
    expect(
      getLifiTokenAddressForCheckout(
        token({
          name: 'USD Coin',
          symbol: 'USDC',
          chain: 'POLYGON',
          decimals: 6,
          address: null,
          walletAddress: '0xf76ec7cf74bd7a3c53cb2bf8c8c625ed59bf6168',
          marketData: {
            price: '0.999618',
          },
        })
      )
    ).toBe('0x3c499c542cef5e3811e1192ce70d8cc03d5c3359');
  });

  it('does not mistake a wallet address for an EVM token contract', () => {
    const walletAddress = '0xf76ec7cf74bd7a3c53cb2bf8c8c625ed59bf6168';

    expect(
      getEvmTokenAddressForCheckout(
        token({
          name: 'Mystery Token',
          symbol: 'MYST',
          chain: 'BASE',
          decimals: 18,
          address: walletAddress,
          walletAddress,
        })
      )
    ).toBeNull();

    expect(
      getLifiTokenAddressForCheckout(
        token({
          name: 'Mystery Token',
          symbol: 'MYST',
          chain: 'BASE',
          decimals: 18,
          address: walletAddress,
          walletAddress,
        })
      )
    ).toBe(NATIVE_EVM_TOKEN_ADDRESS);
  });
});
