import {
  getSwapRecoveryAmountInput,
  parseSwapBalanceChangeError,
} from '@/lib/chat/ticketFormat';

describe('parseSwapBalanceChangeError', () => {
  it('extracts the updated available amount and token symbol', () => {
    expect(
      parseSwapBalanceChangeError(
        'Your MCDX balance changed. Available now: 0.12635657 MCDX. Try the swap again with the updated amount.'
      )
    ).toEqual({
      availableAmount: '0.12635657',
      tokenSymbol: 'MCDX',
    });
  });

  it('falls back to the provided token symbol when the message uses a generic token label', () => {
    expect(
      parseSwapBalanceChangeError(
        'Your token balance changed. Available now: 24.50. Try the swap again with the updated amount.',
        'USDC'
      )
    ).toEqual({
      availableAmount: '24.50',
      tokenSymbol: 'USDC',
    });
  });

  it('returns null for unrelated errors', () => {
    expect(parseSwapBalanceChangeError('Route expired. Refresh and try again.')).toBeNull();
  });
});

describe('getSwapRecoveryAmountInput', () => {
  it('keeps token-sized swaps in token units', () => {
    expect(getSwapRecoveryAmountInput('0.12635657', 'token', 12.34)).toBe(
      '0.12635657'
    );
  });

  it('converts token balance recovery into USD input space for usd-sized swaps', () => {
    expect(getSwapRecoveryAmountInput('0.5', 'usd', 180)).toBe('90');
  });

  it('falls back to token units when usd price data is unavailable', () => {
    expect(getSwapRecoveryAmountInput('0.5', 'usd', 0)).toBe('0.5');
  });
});
