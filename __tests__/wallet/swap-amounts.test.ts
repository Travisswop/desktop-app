import {
  decimalAmountToRawUnits,
  getSafeSwapInputAmount,
} from '@/lib/wallet/swapAmounts';

describe('wallet swap amount formatting', () => {
  it('formats 18-decimal max amounts without filling the input with decimals', () => {
    expect(
      getSafeSwapInputAmount({
        balance: '1.234567890123456789',
        decimals: 18,
        percent: 1,
        subtractOneRawUnit: true,
      }),
    ).toBe('1.23456789');
  });

  it('keeps max input below the real raw-unit balance', () => {
    const balance = decimalAmountToRawUnits('1.234567890123456789', 18);
    const displayedMax = getSafeSwapInputAmount({
      balance: '1.234567890123456789',
      decimals: 18,
      percent: 1,
      subtractOneRawUnit: true,
    });
    const displayedMaxUnits = decimalAmountToRawUnits(displayedMax, 18);

    expect(balance).not.toBeNull();
    expect(displayedMaxUnits).not.toBeNull();
    expect(displayedMaxUnits! < balance!).toBe(true);
  });

  it('reserves SOL fee and rent units before formatting max', () => {
    expect(
      getSafeSwapInputAmount({
        balance: '1',
        decimals: 9,
        percent: 1,
        reserveRawUnits: 2_039_280n + 15_000n,
      }),
    ).toBe('0.99794572');
  });

  it('preserves token-native decimal precision for 6-decimal tokens', () => {
    expect(
      getSafeSwapInputAmount({
        balance: '25.123456',
        decimals: 6,
        percent: 1,
        subtractOneRawUnit: true,
      }),
    ).toBe('25.123455');
  });

  it('parses scientific notation before converting to raw units', () => {
    expect(decimalAmountToRawUnits('1e-7', 9)?.toString()).toBe('100');
  });
});
