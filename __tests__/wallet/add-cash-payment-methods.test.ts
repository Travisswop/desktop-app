import {
  DEFAULT_ADD_CASH_PAYMENT,
  addCashPaymentLabel,
  embeddedCoinbasePaymentMethod,
  getAddCashPaymentOptions,
} from '@/lib/wallet/addCashPaymentMethods';

describe('Add Cash payment methods', () => {
  it('defaults desktop funding to the reliable debit-card flow', () => {
    expect(DEFAULT_ADD_CASH_PAYMENT).toBe('debit_card');
    expect(addCashPaymentLabel(DEFAULT_ADD_CASH_PAYMENT)).toBe('Debit card');
    expect(embeddedCoinbasePaymentMethod(DEFAULT_ADD_CASH_PAYMENT)).toBeNull();
  });

  it('keeps Apple Pay available when Chrome needs the iPhone QR handoff', () => {
    const applePay = getAddCashPaymentOptions(false).find(
      (option) => option.key === 'apple_pay',
    );

    expect(applePay).toEqual(
      expect.objectContaining({
        label: 'Apple Pay',
        sub: expect.stringMatching(/Scan with your iPhone/),
      }),
    );
    expect(embeddedCoinbasePaymentMethod('apple_pay')).toBe(
      'GUEST_CHECKOUT_APPLE_PAY',
    );
  });

  it('explains that native Apple Pay is available when Safari exposes it', () => {
    const applePay = getAddCashPaymentOptions(true).find(
      (option) => option.key === 'apple_pay',
    );

    expect(applePay?.sub).toMatch(/directly on this Mac/);
  });

  it('retains Google Pay as an embedded choice with setup guidance', () => {
    const googlePay = getAddCashPaymentOptions(false).find(
      (option) => option.key === 'google_pay',
    );

    expect(googlePay?.sub).toMatch(/card saved to Google Pay/);
    expect(embeddedCoinbasePaymentMethod('google_pay')).toBe(
      'GUEST_CHECKOUT_GOOGLE_PAY',
    );
  });
});
