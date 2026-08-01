import type {
  CoinbaseOnrampNetwork,
  CoinbaseOnrampPaymentMethod,
} from '@/services/wallet-service';

export type AddCashPaymentChoice =
  | 'debit_card'
  | 'apple_pay'
  | 'google_pay';

export type AddCashPaymentOption = {
  key: AddCashPaymentChoice;
  label: string;
  sub: string;
};

export const DEFAULT_ADD_CASH_PAYMENT: AddCashPaymentChoice = 'debit_card';

export function addCashPaymentLabel(choice: AddCashPaymentChoice) {
  if (choice === 'apple_pay') return 'Apple Pay';
  if (choice === 'google_pay') return 'Google Pay';
  return 'Debit card';
}

export function embeddedCoinbasePaymentMethod(
  choice: AddCashPaymentChoice,
): CoinbaseOnrampPaymentMethod | null {
  if (choice === 'apple_pay') return 'GUEST_CHECKOUT_APPLE_PAY';
  if (choice === 'google_pay') return 'GUEST_CHECKOUT_GOOGLE_PAY';
  return null;
}

/**
 * Chrome cannot raise Apple Pay natively on macOS. Send its iPhone handoff to
 * Swop mobile's approved native checkout instead of Coinbase's web QR flow.
 * `swopme.app` is an associated domain for the iOS app, and the mobile fund
 * route accepts both values so the user lands on the same purchase.
 */
export function swopMobileFundingUrl(
  network: CoinbaseOnrampNetwork,
  amount: string,
) {
  const url = new URL('https://www.swopme.app/fund');
  url.searchParams.set('network', network);
  url.searchParams.set('amount', amount);
  return url.toString();
}

/**
 * Coinbase's desktop Apple Pay fallback renders a circular QR code inside the
 * iframe. It needs more vertical room than the native Safari / Google Pay
 * buttons; otherwise the QR boundary is cropped and cannot be scanned.
 */
export function embeddedCheckoutFrameHeight(
  choice: AddCashPaymentChoice,
  supportsNativeApplePay: boolean,
) {
  if (choice === 'apple_pay' && !supportsNativeApplePay) {
    return 'clamp(280px, 48vh, 320px)';
  }

  return '220px';
}

// Coinbase Headless Onramp renders native Apple Pay in Safari. Other desktop
// browsers hand off to Swop mobile's native checkout. Debit-card entry belongs
// to Coinbase Hosted Onramp, which must open in a popup/new tab (not an iframe).
export function getAddCashPaymentOptions(
  supportsNativeApplePay: boolean,
): AddCashPaymentOption[] {
  return [
    {
      key: 'debit_card',
      label: 'Debit card',
      sub: 'Recommended · secure Coinbase checkout window',
    },
    {
      key: 'apple_pay',
      label: 'Apple Pay',
      sub: supportsNativeApplePay
        ? 'Pay directly on this Mac'
        : 'Scan to continue in Swop on your iPhone',
    },
    {
      key: 'google_pay',
      label: 'Google Pay',
      sub: 'Requires an eligible card saved to Google Pay',
    },
  ];
}
