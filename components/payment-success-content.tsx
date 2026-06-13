'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { toast as sonner } from 'sonner';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const ink = '#0a0a0c';
const muted = '#6e6e76';
const muted2 = '#a1a1a8';
const hair = 'rgba(0,0,0,0.06)';
const hair2 = 'rgba(0,0,0,0.04)';
const posGreen = '#19a974';
const posGreenSoft = 'rgba(25,169,116,0.1)';
const cardShadow =
  '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)';
const mono = 'var(--font-jetbrains-mono), ui-monospace, monospace';

type Status = 'success' | 'processing' | 'error' | 'loading';

const TONE: Record<
  Status,
  { iconBg: string; iconColor: string; tagBg: string; tagFg: string; label: string }
> = {
  success: {
    iconBg: posGreenSoft,
    iconColor: posGreen,
    tagBg: posGreenSoft,
    tagFg: posGreen,
    label: 'Completed',
  },
  processing: {
    iconBg: 'rgba(217,119,6,0.10)',
    iconColor: '#b45309',
    tagBg: 'rgba(217,119,6,0.12)',
    tagFg: '#b45309',
    label: 'Processing',
  },
  error: {
    iconBg: 'rgba(229,72,77,0.10)',
    iconColor: '#dc2626',
    tagBg: 'rgba(229,72,77,0.12)',
    tagFg: '#b91c1c',
    label: 'Failed',
  },
  loading: {
    iconBg: '#f4f4f2',
    iconColor: muted,
    tagBg: '#f4f4f2',
    tagFg: muted,
    label: 'Verifying',
  },
};

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const paymentIntentClientSecret = searchParams?.get(
      'payment_intent_client_secret'
    );
    const paymentIntent = searchParams?.get('payment_intent');
    const orderIdParam = searchParams?.get('orderId');
    const usernameParam = searchParams?.get('username');

    if (orderIdParam) setOrderId(orderIdParam);
    if (usernameParam) setUsername(usernameParam);

    if (paymentIntentClientSecret && paymentIntent) {
      setPaymentIntentId(paymentIntent);

      const checkStatus = async () => {
        const stripe = await stripePromise;
        if (stripe) {
          const { paymentIntent: pi } = await stripe.retrievePaymentIntent(
            paymentIntentClientSecret
          );
          switch (pi?.status) {
            case 'succeeded':
              setStatus('success');
              break;
            case 'processing':
              setStatus('processing');
              break;
            case 'requires_payment_method':
              setStatus('error');
              if (orderIdParam && usernameParam) {
                router.push(
                  `/payment-failed?orderId=${orderIdParam}&message=Payment%20method%20failed&username=${usernameParam}`
                );
              }
              break;
            default:
              setStatus('error');
          }
        }
      };
      checkStatus();
    } else if (orderIdParam) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  }, [searchParams, router]);

  const tone = TONE[status];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        background: '#fff',
        border: `1px solid ${hair}`,
        borderRadius: 22,
        boxShadow: cardShadow,
        overflow: 'hidden',
      }}
    >
      {/* Hero */}
      <div
        style={{
          padding: '34px 28px 28px',
          textAlign: 'center',
          borderBottom: `1px solid ${hair2}`,
        }}
      >
        {/* Status icon */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: tone.iconBg,
            marginBottom: 16,
          }}
        >
          {status === 'success' && (
            <CheckCircle2 size={32} color={tone.iconColor} strokeWidth={1.8} />
          )}
          {status === 'processing' && (
            <Loader2
              size={32}
              color={tone.iconColor}
              strokeWidth={1.8}
              className="animate-spin"
            />
          )}
          {status === 'error' && (
            <AlertTriangle size={32} color={tone.iconColor} strokeWidth={1.8} />
          )}
          {status === 'loading' && (
            <Loader2
              size={28}
              color={tone.iconColor}
              className="animate-spin"
            />
          )}
        </div>

        {/* Tag */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 9px',
            borderRadius: 5,
            background: tone.tagBg,
            color: tone.tagFg,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            fontFamily: mono,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              background: tone.tagFg,
            }}
          />
          {tone.label}
        </span>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.5,
            color: ink,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {status === 'success'
            ? 'Payment successful'
            : status === 'processing'
            ? 'Payment processing'
            : status === 'loading'
            ? 'Verifying your payment'
            : "Payment couldn't complete"}
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: muted,
            marginTop: 6,
            marginBottom: 0,
            lineHeight: 1.45,
          }}
        >
          {status === 'success'
            ? 'Your order is confirmed. A receipt has been sent to your email.'
            : status === 'processing'
            ? "We'll email you the moment your transaction settles."
            : status === 'loading'
            ? 'Hang on a few seconds while we confirm the transaction.'
            : 'No charge was made. You can try again from the cart.'}
        </p>
      </div>

      {/* Details */}
      {(orderId || paymentIntentId) && (
        <div
          style={{
            padding: '18px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            borderBottom: `1px solid ${hair2}`,
          }}
        >
          {orderId && (
            <DetailRow label="Order ID" value={orderId} copyable />
          )}
          {paymentIntentId && (
            <DetailRow label="Payment ID" value={paymentIntentId} copyable />
          )}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {orderId && status === 'success' && (
          <Link
            href={`/order/${orderId}`}
            style={{ textDecoration: 'none' }}
          >
            <button
              type="button"
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 12,
                background: ink,
                color: '#fff',
                border: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: -0.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              View order details
              <ArrowRight size={14} />
            </button>
          </Link>
        )}

        <Link
          href={username ? `/sp/${username}` : '/'}
          style={{ textDecoration: 'none' }}
        >
          <button
            type="button"
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: 12,
              background: orderId && status === 'success' ? '#fff' : ink,
              color: orderId && status === 'success' ? ink : '#fff',
              border:
                orderId && status === 'success'
                  ? `1px solid ${hair}`
                  : 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: -0.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <ShoppingBag size={14} />
            Continue shopping
          </button>
        </Link>
      </div>
    </div>
  );
}

const DetailRow = ({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      sonner.success(`Copied — ${label}`, {
        description:
          value.length > 40 ? `${value.slice(0, 38)}…` : value,
        duration: 2000,
      });
    } catch {
      sonner.error('Could not copy');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: muted,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          fontFamily: mono,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
        }}
      >
        <code
          style={{
            fontFamily: mono,
            fontSize: 12.5,
            color: ink,
            fontWeight: 500,
            background: '#fafafa',
            border: `1px solid ${hair2}`,
            padding: '4px 8px',
            borderRadius: 6,
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={value}
        >
          {value}
        </code>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy ${label}`}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: muted2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Copy size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
