import { checkoutUrlWithPaymentMethod } from '@/lib/phantom-checkout';

describe('checkout URL helpers', () => {
  it('adds the selected payment method to an absolute checkout URL', () => {
    expect(
      checkoutUrlWithPaymentMethod({
        checkoutUrl: 'https://www.swopme.app/checkout/co_test',
        intentId: 'co_test',
        method: 'swop',
      })
    ).toBe('https://www.swopme.app/checkout/co_test?method=swop');
  });

  it('preserves existing params while replacing the payment method', () => {
    expect(
      checkoutUrlWithPaymentMethod({
        checkoutUrl: '/checkout/co_test?method=phantom&coupon=save#review',
        intentId: 'co_test',
        method: 'swop',
        origin: 'https://www.swopme.app',
      })
    ).toBe(
      'https://www.swopme.app/checkout/co_test?method=swop&coupon=save#review'
    );
  });

  it('falls back to an intent URL when the API response omits checkoutUrl', () => {
    expect(
      checkoutUrlWithPaymentMethod({
        intentId: 'co_test',
        method: 'phantom',
        origin: 'http://localhost:3000',
      })
    ).toBe('http://localhost:3000/checkout/co_test?method=phantom');
  });
});
