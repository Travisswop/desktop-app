'use client';

// Add cash — desktop port of the mobile fund screen (Expo src/app/(app)/fund.tsx).
// A keypad sets the USD amount, a payment row picks the rail, and the purchase
// runs through Coinbase's EMBEDDED guest checkout without ever leaving Swop:
// the backend mints a single-use payment link and we render it in an iframe so
// the browser raises its own Apple Pay / Google Pay sheet over the app.
//
// Coinbase requires an OTP-verified US phone before it will create an embedded
// order (re-verified every 60 days) — /onramp/phone/{status,start,verify}.
// otpRequired is false on backends without TWILIO_*, where the number is simply
// collected and forwarded with the order.

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Delete,
  Loader2,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { FaApple } from 'react-icons/fa6';
import { SiGooglepay } from 'react-icons/si';

import CustomModal from '@/components/modal/CustomModal';
import {
  TradeCelebrationOverlay,
  type TradeCelebrationSpec,
} from '@/components/celebrations/TradeCelebration';
import { useUser } from '@/lib/UserContext';
import WalletService, {
  type CoinbaseOnrampNetwork,
  type CoinbaseOnrampOrderResponse,
  type CoinbaseOnrampPaymentMethod,
  type OnrampPhoneStatus,
} from '@/services/wallet-service';

type FundingOption = {
  network: CoinbaseOnrampNetwork;
  label: string;
  description: string;
  walletType: 'evm' | 'solana';
};

// Swop-wallet deposits only — same set/order as CoinbaseOnrampFunding and the
// mobile ONRAMP_OPTIONS. Predictions (Polygon) and Perps (Arbitrum) were
// deliberately dropped; deposits land in the user's wallet first.
const FUNDING_OPTIONS: FundingOption[] = [
  {
    network: 'base',
    label: 'Base',
    description: 'Base network USDC',
    walletType: 'evm',
  },
  {
    network: 'ethereum',
    label: 'Ethereum',
    description: 'Ethereum mainnet USDC',
    walletType: 'evm',
  },
  {
    network: 'solana',
    label: 'Solana',
    description: 'Solana wallet USDC',
    walletType: 'solana',
  },
];

/** Coinbase's cap on the embedded Apple/Google Pay guest-checkout path. */
const GUEST_CHECKOUT_MAX_USD = 500;

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'delete'],
] as const;

const QUICK_AMOUNTS = ['25', '50', '100', '250'] as const;

type Step = 'amount' | 'phone' | 'checkout';
type Sheet = 'network' | 'method' | null;

type OnrampEventName =
  | 'onramp_api.load_pending'
  | 'onramp_api.load_success'
  | 'onramp_api.load_error'
  | 'onramp_api.commit_success'
  | 'onramp_api.commit_error'
  | 'onramp_api.polling_start'
  | 'onramp_api.polling_success'
  | 'onramp_api.polling_error'
  | (string & {});

function truncateAddress(address?: string | null) {
  if (!address) return 'No wallet found';
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Mirror of the backend's normalizeUsPhoneNumber: Coinbase guest checkout only
// accepts strict US E.164 (+1XXXXXXXXXX). Gate on the same rule the server
// enforces so users don't get a 400 round-trip after clicking.
function toUsE164(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (digits[0] === '0' || digits[0] === '1') return null;
  return `+1${digits}`;
}

function normalizePhoneInput(value: string) {
  return value.replace(/[^\d+()\-\s.]/g, '');
}

// Amount type shrinks as the number grows, matching the mobile keypad.
function amountFontSize(amount: string) {
  if (amount.length <= 5) return 'text-[56px]';
  if (amount.length <= 8) return 'text-[44px]';
  if (amount.length <= 11) return 'text-[34px]';
  return 'text-[26px]';
}

function isDomainAllowlistError(message: string) {
  return /domain.+allow[- ]?list/i.test(message);
}

function isOrdersApiAuthorizationError(message: string) {
  return /not authorized to create onramp orders/i.test(message);
}

function withCoinbaseSandboxParam(
  paymentLinkUrl: string,
  paymentMethod: CoinbaseOnrampPaymentMethod,
) {
  const param =
    paymentMethod === 'GUEST_CHECKOUT_GOOGLE_PAY'
      ? 'useGooglePaySandbox'
      : 'useApplePaySandbox';
  try {
    const url = new URL(paymentLinkUrl);
    url.searchParams.set(param, 'true');
    return url.toString();
  } catch {
    const separator = paymentLinkUrl.includes('?') ? '&' : '?';
    return `${paymentLinkUrl}${separator}${param}=true`;
  }
}

const toNumber = (value: unknown): number | null => {
  // Number(null) and Number('') are both 0, which would make a missing
  // Coinbase quote look like a real zero-dollar delivery. Only parse values
  // the response actually supplied.
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type OrderQuote = {
  purchaseAmount: number | null;
  paidUsd: number | null;
  feeUsd: number | null;
};

/**
 * Coinbase prices guest checkout at order-creation time and its fee comes OUT
 * of the charge — pay $25.00 and ~$0.85 of it is Coinbase's exchange fee, so
 * ~24.15 USDC is delivered. There is no pre-quote for this rail (the v1
 * buy-quote API rejects GUEST_CHECKOUT_*), so this committed quote on the order
 * is the only place the real numbers exist. Surface them, never assume 1:1.
 */
function readOrderQuote(order: CoinbaseOnrampOrderResponse): OrderQuote {
  const raw = (order.order ?? {}) as Record<string, any>;
  const fees: { type?: string; amount?: unknown }[] = Array.isArray(raw.fees)
    ? raw.fees
    : [];
  const exchangeFee = fees.find((fee) => fee.type === 'FEE_TYPE_EXCHANGE');
  return {
    purchaseAmount: toNumber(raw.purchaseAmount),
    paidUsd: toNumber(raw.paymentTotal) ?? toNumber(order.paymentAmount),
    feeUsd: toNumber(exchangeFee?.amount),
  };
}

// Human copy for Coinbase's postMessage lifecycle, so the modal narrates the
// purchase instead of leaking `onramp_api.*` identifiers.
function describeEvent(event: OnrampEventName | null, payLabel: string) {
  switch (event) {
    case 'onramp_api.load_pending':
      return `Loading ${payLabel}…`;
    case 'onramp_api.load_success':
      return `Ready — confirm with ${payLabel}.`;
    case 'onramp_api.commit_success':
    case 'onramp_api.polling_start':
      return 'Payment approved — Coinbase is delivering your USDC.';
    case 'onramp_api.polling_success':
      return 'USDC delivered to your Swop wallet.';
    default:
      return null;
  }
}

type AddCashModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialNetwork?: CoinbaseOnrampNetwork;
};

export default function AddCashModal({
  isOpen,
  onClose,
  initialNetwork,
}: AddCashModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, accessToken } = useUser();
  const { wallets: evmWallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();

  const [step, setStep] = useState<Step>('amount');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [network, setNetwork] = useState<CoinbaseOnrampNetwork>(
    initialNetwork && FUNDING_OPTIONS.some((o) => o.network === initialNetwork)
      ? initialNetwork
      : 'base',
  );
  const [guestMethod, setGuestMethod] =
    useState<CoinbaseOnrampPaymentMethod>('GUEST_CHECKOUT_GOOGLE_PAY');
  const [amount, setAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentEvent, setPaymentEvent] = useState<OnrampEventName | null>(null);
  const [celebration, setCelebration] = useState<TradeCelebrationSpec | null>(
    null,
  );

  const [phoneStatus, setPhoneStatus] = useState<OnrampPhoneStatus | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Committed quote from the order Coinbase priced — the only place the real
  // delivered amount and fee exist for this rail.
  const quoteRef = useRef<OrderQuote | null>(null);
  // commit_success and polling_success both mean "it worked"; celebrate once.
  const celebratedRef = useRef(false);

  // Which wallet rail this browser can actually raise. Safari (and Chrome on a
  // Mac with a paired device) exposes ApplePaySession; everything else gets
  // Google Pay, which Coinbase renders in the same payment link.
  const [supportsApplePay, setSupportsApplePay] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const applePay = (window as any).ApplePaySession;
    const supported = Boolean(applePay?.canMakePayments?.());
    setSupportsApplePay(supported);
    if (supported) setGuestMethod('GUEST_CHECKOUT_APPLE_PAY');
  }, []);

  const payLabel =
    guestMethod === 'GUEST_CHECKOUT_APPLE_PAY' ? 'Apple Pay' : 'Google Pay';

  useEffect(() => {
    if (!isOpen || !accessToken) return;
    let cancelled = false;
    WalletService.getOnrampPhoneStatus(accessToken)
      .then((status) => {
        if (!cancelled) setPhoneStatus(status);
      })
      .catch(() => {
        // Status endpoint unavailable (older backend) — keep the legacy flow,
        // where the number is collected but never OTP-verified.
        if (!cancelled) {
          setPhoneStatus({
            otpRequired: false,
            verified: false,
            phoneNumberMasked: null,
            verifiedAt: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, accessToken]);

  const otpRequired = Boolean(phoneStatus?.otpRequired);
  const phoneVerified = Boolean(phoneStatus?.verified);
  const legacyPhoneReady = toUsE164(phoneInput) !== null;
  // Guest checkout always needs a phone: verified by OTP where the backend has
  // Twilio, otherwise a locally-valid US number forwarded with the order.
  const needsPhone = otpRequired ? !phoneVerified : !legacyPhoneReady;

  const evmAddress = useMemo(() => {
    const embeddedWallet =
      evmWallets?.find((wallet: any) => wallet.walletClientType === 'privy') ||
      evmWallets?.[0];
    return (
      embeddedWallet?.address ||
      (user as any)?.ethereumWallet ||
      user?.ethAddress ||
      (String(user?.address || '').startsWith('0x') ? user?.address : '')
    );
  }, [evmWallets, user]);

  const solanaAddress = useMemo(
    () =>
      (user as any)?.solanaWallet ||
      user?.solanaAddress ||
      solanaWallets?.[0]?.address,
    [solanaWallets, user],
  );

  const selected =
    FUNDING_OPTIONS.find((option) => option.network === network) ??
    FUNDING_OPTIONS[0];
  const destination =
    selected.walletType === 'solana' ? solanaAddress : evmAddress;

  const amountNumber = Number(amount);
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0;
  const overGuestLimit = amountNumber > GUEST_CHECKOUT_MAX_USD;
  const canBuy =
    Boolean(accessToken) &&
    amountValid &&
    !overGuestLimit &&
    !loading &&
    step === 'amount';

  const pressKey = useCallback((key: string) => {
    setError(null);
    if (key === 'delete') {
      setAmount((prev) => (prev.length === 1 ? '0' : prev.slice(0, -1)));
      return;
    }
    setAmount((prev) => {
      if (key === '.' && prev.includes('.')) return prev;
      const next = prev === '0' && key !== '.' ? key : prev + key;
      // Fiat carries two decimals; the keypad simply refuses a third.
      const [, decimals] = next.split('.');
      if (decimals && decimals.length > 2) return prev;
      return next;
    });
  }, []);

  const resetFlow = useCallback(() => {
    setStep('amount');
    setSheet(null);
    setAmount('0');
    setError(null);
    setLoading(false);
    setPaymentUrl(null);
    setPaymentEvent(null);
    setCelebration(null);
    setPhoneCode('');
    setCodeSent(false);
    setPhoneError(null);
    quoteRef.current = null;
    celebratedRef.current = false;
  }, []);

  const handleClose = useCallback(() => {
    resetFlow();
    onClose();
  }, [onClose, resetFlow]);

  const startGuestCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPaymentEvent(null);
    celebratedRef.current = false;

    try {
      const agreementAcceptedAt = new Date().toISOString();
      const order = await WalletService.createCoinbaseOnrampOrder(
        {
          network,
          purchaseCurrency: 'USDC',
          paymentCurrency: 'USD',
          paymentAmount: amount,
          paymentMethod: guestMethod,
          // With OTP enforcement the backend uses the stored verified number
          // and its real verification timestamp; client phone fields are
          // ignored there, so only send them on legacy backends.
          ...(otpRequired
            ? {}
            : {
                phoneNumber: toUsE164(phoneInput) ?? phoneInput,
                phoneNumberVerifiedAt: agreementAcceptedAt,
              }),
          agreementAcceptedAt,
          domain:
            typeof window !== 'undefined' ? window.location.hostname : undefined,
        },
        accessToken,
      );

      const paymentLinkUrl = order.paymentLink?.url;
      if (!paymentLinkUrl) {
        throw new Error('Coinbase did not return a payment sheet. Try again.');
      }
      quoteRef.current = readOrderQuote(order);
      setPaymentUrl(
        order.sandbox
          ? withCoinbaseSandboxParam(paymentLinkUrl, order.paymentMethod)
          : paymentLinkUrl,
      );
      setStep('checkout');
    } catch (err: any) {
      const message =
        err?.message || 'Unable to start Coinbase checkout in Swop.';

      // The stored verification lapsed (60-day re-verify) — reopen the OTP
      // step instead of dead-ending on the raw backend message.
      if (/verify your phone/i.test(message)) {
        setPhoneStatus((status) =>
          status ? { ...status, verified: false } : status,
        );
        setPhoneError(message);
        setStep('phone');
        return;
      }

      if (isDomainAllowlistError(message)) {
        setError(
          'Coinbase blocked embedded checkout for this domain. Allow-list it in Coinbase Developer Platform and try again.',
        );
        return;
      }

      if (isOrdersApiAuthorizationError(message)) {
        setError(
          `${payLabel} embedded checkout is not enabled for this Coinbase app yet.`,
        );
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    amount,
    guestMethod,
    network,
    otpRequired,
    payLabel,
    phoneInput,
  ]);

  const handleBuy = useCallback(() => {
    if (!canBuy) return;
    if (needsPhone) {
      setPhoneError(null);
      setStep('phone');
      return;
    }
    void startGuestCheckout();
  }, [canBuy, needsPhone, startGuestCheckout]);

  const sendCode = async () => {
    const normalized = toUsE164(phoneInput);
    if (!normalized) {
      setPhoneError('Enter a US mobile number.');
      return;
    }
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      await WalletService.startOnrampPhoneVerification(normalized, accessToken);
      setCodeSent(true);
      setPhoneCode('');
    } catch (err: any) {
      setPhoneError(err?.message || 'Unable to send verification code.');
    } finally {
      setPhoneBusy(false);
    }
  };

  const confirmCode = async () => {
    const normalized = toUsE164(phoneInput);
    if (!normalized || !phoneCode.trim()) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      const result = await WalletService.verifyOnrampPhoneCode(
        normalized,
        phoneCode.trim(),
        accessToken,
      );
      setPhoneStatus({
        otpRequired: true,
        verified: true,
        phoneNumberMasked: result.phoneNumberMasked,
        verifiedAt: result.verifiedAt,
      });
      setPhoneCode('');
      setCodeSent(false);
      // Verification was only ever a gate on the purchase — resume it.
      void startGuestCheckout();
    } catch (err: any) {
      setPhoneError(err?.message || 'Verification failed. Try again.');
    } finally {
      setPhoneBusy(false);
    }
  };

  // Fire on the first success signal — commit_success means the payment sheet
  // authorized the charge, which is the moment worth celebrating; delivery
  // (polling_success) can trail it by a while.
  const handleSuccess = useCallback(
    (eventName: OnrampEventName) => {
      if (celebratedRef.current) return;
      celebratedRef.current = true;
      const quote = quoteRef.current;
      const paidUsd = quote?.paidUsd ?? amountNumber;
      const delivered = quote?.purchaseAmount ?? paidUsd;
      setCelebration({
        kind: 'cash-added',
        amount: delivered,
        symbol: 'USDC',
        paidUsd,
        feeUsd: quote?.feeUsd ?? null,
        networkLabel: selected.label,
        payLabel,
        note:
          eventName === 'onramp_api.polling_success'
            ? 'Delivered — your balance is up to date.'
            : undefined,
      });
    },
    [amountNumber, payLabel, selected.label],
  );

  // Only trust postMessage events coming from the exact Coinbase frame we
  // embedded — otherwise any other window could spoof a success/error event.
  useEffect(() => {
    if (!paymentUrl || typeof window === 'undefined') return;

    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(paymentUrl).origin;
    } catch {
      // A malformed payment link should never weaken the origin check.
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;

      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      const eventName: string | undefined = payload?.eventName;
      if (!eventName?.startsWith?.('onramp_api.')) return;
      setPaymentEvent(eventName);

      const errorMessage = payload?.data?.errorMessage;
      if (errorMessage) {
        setError(errorMessage);
      } else if (eventName === 'onramp_api.load_error') {
        setError('Coinbase checkout could not load. Go back and try again.');
      } else if (eventName === 'onramp_api.commit_error') {
        setError('Coinbase could not approve the payment. Try again.');
      } else if (eventName === 'onramp_api.polling_error') {
        setError(
          'Coinbase is still confirming delivery. Check your wallet shortly.',
        );
      } else if (eventName === 'onramp_api.cancel') {
        setError('Payment canceled. Go back to change the amount or try again.');
      }

      if (
        eventName === 'onramp_api.commit_success' ||
        eventName === 'onramp_api.polling_success'
      ) {
        handleSuccess(eventName);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleSuccess, paymentUrl]);

  // Physical keyboard drives the keypad — this is a desktop app, typing an
  // amount should just work. Escape remains available from every step.
  useEffect(() => {
    if (!isOpen || celebration) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }

      if (step !== 'amount' || sheet || loading) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (/^[0-9]$/.test(event.key) || event.key === '.') {
        event.preventDefault();
        pressKey(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        pressKey('delete');
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleBuy();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    celebration,
    handleBuy,
    handleClose,
    isOpen,
    loading,
    pressKey,
    sheet,
    step,
  ]);

  // Coinbase has the money; the wallet is where the user wants to land. Refresh
  // balances on the way so the new USDC shows up.
  const finishToWallet = () => {
    handleClose();
    queryClient.invalidateQueries({ queryKey: ['walletTokens'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    router.push('/wallet');
  };

  if (!isOpen) return null;

  const progress = describeEvent(paymentEvent, payLabel);
  const settled = paymentEvent === 'onramp_api.polling_success';
  const stepTitle =
    step === 'phone'
      ? 'Verify your phone'
      : step === 'checkout'
        ? `Confirm with ${payLabel}`
        : 'Add cash';

  const PayGlyph =
    guestMethod === 'GUEST_CHECKOUT_APPLE_PAY' ? FaApple : SiGooglepay;

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onClose={handleClose}
        onCloseModal={handleClose}
        width="max-w-[420px]"
        removeCloseButton
        ariaLabel="Add cash"
        panelClassName="rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(10,10,12,0.35)]"
      >
        <div className="relative">
          {/* header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            {step === 'amount' && !sheet ? (
              <span className="h-9 w-9" />
            ) : (
              <button
                type="button"
                aria-label="Back"
                onClick={() => {
                  if (sheet) {
                    setSheet(null);
                    return;
                  }
                  setError(null);
                  setPaymentUrl(null);
                  setPaymentEvent(null);
                  setStep('amount');
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
            )}
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">
              {sheet === 'network'
                ? 'Deposit to'
                : sheet === 'method'
                  ? 'Pay with'
                  : stepTitle}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          {sheet === 'network' ? (
            <div className="space-y-2 p-4">
              {FUNDING_OPTIONS.map((option) => {
                const address =
                  option.walletType === 'solana' ? solanaAddress : evmAddress;
                const active = option.network === network;
                return (
                  <button
                    key={option.network}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setNetwork(option.network);
                      setSheet(null);
                      setError(null);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-black/[0.06] hover:border-black/[0.15]'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-gray-950">
                        USDC on {option.label}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-gray-400">
                        {option.description} · {truncateAddress(address)}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-[18px] w-[18px] shrink-0 text-emerald-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : sheet === 'method' ? (
            <div className="space-y-2 p-4">
              {(
                [
                  {
                    key: 'GUEST_CHECKOUT_APPLE_PAY' as const,
                    label: 'Apple Pay',
                    sub: supportsApplePay
                      ? `Embedded in Swop · Coinbase fee ~3% · up to $${GUEST_CHECKOUT_MAX_USD}`
                      : 'Requires Safari with Apple Pay enabled',
                    disabled: !supportsApplePay,
                  },
                  {
                    key: 'GUEST_CHECKOUT_GOOGLE_PAY' as const,
                    label: 'Google Pay',
                    sub: `Embedded in Swop · Coinbase fee ~3% · up to $${GUEST_CHECKOUT_MAX_USD}`,
                    disabled: false,
                  },
                ] as {
                  key: CoinbaseOnrampPaymentMethod;
                  label: string;
                  sub: string;
                  disabled: boolean;
                }[]
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={loading || option.disabled}
                  onClick={() => {
                    setGuestMethod(option.key);
                    setSheet(null);
                    setError(null);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    option.key === guestMethod
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-black/[0.06] hover:border-black/[0.15]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-gray-950">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-gray-400">
                      {option.sub}
                    </span>
                  </span>
                  {option.key === guestMethod ? (
                    <Check className="h-[18px] w-[18px] shrink-0 text-emerald-600" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : step === 'phone' ? (
            <div className="space-y-3 px-5 pb-5 pt-2">
              <p className="text-[13px] leading-[19px] text-gray-500">
                Coinbase requires a verified US mobile number before it can take
                your {payLabel} payment. One-time step, renewed every 60 days.
              </p>
              <div className="flex items-center gap-2 rounded-2xl border border-black/[0.06] px-3">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  value={phoneInput}
                  onChange={(event) =>
                    setPhoneInput(normalizePhoneInput(event.target.value))
                  }
                  disabled={phoneBusy || codeSent}
                  inputMode="tel"
                  autoFocus
                  placeholder="+1 555 123 4567"
                  className="w-full bg-transparent py-3 text-[16px] font-semibold text-gray-950 outline-none disabled:opacity-60"
                />
              </div>
              {codeSent ? (
                <div className="flex items-center gap-2 rounded-2xl border border-black/[0.06] px-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    value={phoneCode}
                    onChange={(event) =>
                      setPhoneCode(event.target.value.replace(/\D/g, ''))
                    }
                    disabled={phoneBusy}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="6-digit code"
                    className="w-full bg-transparent py-3 text-[16px] font-semibold tracking-[0.2em] text-gray-950 outline-none disabled:opacity-60"
                  />
                </div>
              ) : null}
              {phoneError ? (
                <p className="rounded-2xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
                  {phoneError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={codeSent ? confirmCode : sendCode}
                disabled={
                  phoneBusy ||
                  (codeSent ? !phoneCode.trim() : !toUsE164(phoneInput))
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gray-950 text-[15px] font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {phoneBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {codeSent ? 'Verify and continue' : 'Text me a code'}
              </button>
              {codeSent ? (
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setPhoneCode('');
                    setPhoneError(null);
                  }}
                  className="w-full text-[12px] font-semibold text-gray-500 underline-offset-2 hover:underline"
                >
                  Use a different number
                </button>
              ) : null}
            </div>
          ) : step === 'checkout' ? (
            <div className="space-y-3 px-5 pb-5 pt-2">
              <div className="text-center">
                <p className="font-mono text-[28px] font-semibold tracking-[-0.02em] text-gray-950">
                  ${amount}
                </p>
                <p className="mt-1 text-[12px] text-gray-500">
                  USDC on {selected.label} · {truncateAddress(destination)}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                <iframe
                  title="Coinbase payment"
                  src={paymentUrl ?? undefined}
                  allow="payment"
                  // Apple/Google Pay open a payment sheet and submit forms, so
                  // the sandbox must permit popups and forms as well as scripts.
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                  referrerPolicy="no-referrer"
                  className="h-[220px] w-full border-0 bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2.5 text-[12px] text-gray-600">
                {settled ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                )}
                <span>
                  {progress ?? `Press the ${payLabel} button to pay.`}
                </span>
              </div>
              {error ? (
                <p className="rounded-2xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="px-5 pb-5 pt-1">
              {/* amount */}
              <div className="flex flex-col items-center pb-1 pt-2">
                <p
                  className={`font-mono font-semibold tracking-[-0.03em] text-gray-950 tabular-nums ${amountFontSize(
                    amount,
                  )}`}
                >
                  ${amount}
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setSheet('network')}
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-black/[0.06] px-3 py-1.5 text-[12px] text-gray-500 transition hover:border-black/[0.15] hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">
                    USDC on {selected.label} · {truncateAddress(destination)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>

              {/* quick amounts */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setAmount(value);
                      setError(null);
                    }}
                    className={`h-9 rounded-full border text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      amount === value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-black/[0.06] text-gray-900 hover:border-black/[0.15]'
                    }`}
                  >
                    ${value}
                  </button>
                ))}
              </div>

              {/* keypad */}
              <div className="mt-3 grid grid-cols-3 gap-1">
                {KEYPAD_ROWS.flatMap((row) => row).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={key === 'delete' ? 'Delete' : key}
                    disabled={loading}
                    onClick={() => pressKey(key)}
                    className="flex h-[52px] items-center justify-center rounded-2xl text-[22px] font-medium text-gray-950 transition hover:bg-gray-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {key === 'delete' ? (
                      <Delete className="h-[22px] w-[22px]" />
                    ) : (
                      key
                    )}
                  </button>
                ))}
              </div>

              {/* footer */}
              <div className="mt-3 space-y-2">
                {overGuestLimit ? (
                  <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700">
                    Embedded checkout is capped at ${GUEST_CHECKOUT_MAX_USD} per
                    purchase — lower the amount to continue.
                  </p>
                ) : null}
                {error ? (
                  <p className="rounded-2xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setSheet('method')}
                  className="flex w-full items-center gap-2 rounded-2xl border border-black/[0.06] px-3 py-2.5 text-[13px] font-semibold text-gray-950 transition hover:border-black/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PayGlyph className="h-4 w-4 text-gray-900" />
                  <span className="flex-1 text-left">{payLabel}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>

                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={!canBuy}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gray-950 text-[15px] font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PayGlyph className="h-4 w-4" />
                  )}
                  {`Buy with ${payLabel}`}
                </button>

                <p className="text-center text-[11px] leading-[16px] text-gray-400">
                  Processed by Coinbase, who deducts their fee from this amount —
                  Swop adds nothing. By continuing you accept Coinbase&apos;s
                  guest checkout terms, user agreement, and privacy policy.
                </p>
              </div>
            </div>
          )}
        </div>
      </CustomModal>

      {celebration ? (
        <TradeCelebrationOverlay
          spec={celebration}
          onDone={finishToWallet}
        />
      ) : null}
    </>
  );
}
