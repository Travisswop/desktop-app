import {
  isSilentRedeemUnavailableError,
  resolveRedeemWallet,
} from '@/lib/polymarket/redeem-wallet';

describe('Polymarket redeem wallet resolution', () => {
  it('uses the position proxy wallet before the current session safe wallet', () => {
    expect(
      resolveRedeemWallet(
        { proxyWallet: '0xPositionSafe' },
        {
          safeAddress: '0xCurrentSafe',
          depositWalletAddress: '0xDeposit',
          walletType: 'safe',
        },
      ),
    ).toEqual({
      positionWallet: '0xPositionSafe',
      walletType: 'safe',
      depositWalletAddress: undefined,
    });
  });

  it('marks deposit redeems only when the position wallet is the active deposit wallet', () => {
    expect(
      resolveRedeemWallet(
        { proxyWallet: '0xDeposit' },
        {
          safeAddress: '0xSafe',
          depositWalletAddress: '0xdePosit',
          walletType: 'deposit',
        },
      ),
    ).toEqual({
      positionWallet: '0xDeposit',
      walletType: 'deposit',
      depositWalletAddress: '0xdePosit',
    });
  });

  it('falls back to the current safe wallet when the position has no proxy wallet', () => {
    expect(
      resolveRedeemWallet(
        { proxyWallet: null },
        {
          safeAddress: '0xSafe',
          depositWalletAddress: '0xDeposit',
          walletType: 'deposit',
        },
      ),
    ).toEqual({
      positionWallet: '0xSafe',
      walletType: 'safe',
      depositWalletAddress: undefined,
    });
  });

  it('detects silent signing readiness errors for auto-claim fallback UI', () => {
    expect(
      isSilentRedeemUnavailableError(
        new Error('Silent redeem signing is not ready for this wallet.'),
      ),
    ).toBe(true);
    expect(isSilentRedeemUnavailableError(new Error('network failed'))).toBe(
      false,
    );
  });
});
