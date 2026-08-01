import type { CoinbaseOnrampPaymentMethod } from '@/services/wallet-service';

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

// Coinbase Headless Onramp renders native Apple Pay in Safari and falls back
// to an iPhone QR handoff in other desktop browsers. Debit-card entry belongs
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
        : 'Scan with your iPhone, or use Safari for native Apple Pay',
    },
    {
      key: 'google_pay',
      label: 'Google Pay',
      sub: 'Requires an eligible card saved to Google Pay',
    },
  ];
}
