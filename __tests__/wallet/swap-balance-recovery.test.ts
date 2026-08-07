import { parseSwapBalanceRecoveryState } from '@/lib/wallet/swapBalanceRecovery';

describe('swap balance recovery parsing', () => {
  test('extracts the updated balance and token symbol from the balance drift error', () => {
    expect(
      parseSwapBalanceRecoveryState(
        'Your MCDX balance changed. Available now: 0.12635657 MCDX. Try the swap again with the updated amount.',
      ),
    ).toEqual({
      reasonCode: 'balance_changed',
      availableAmount: '0.12635657',
      tokenSymbol: 'MCDX',
    });
  });

  test('returns null for unrelated swap failures', () => {
    expect(
      parseSwapBalanceRecoveryState('Swap failed due to excessive slippage.'),
    ).toBeNull();
  });
});
