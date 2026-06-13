'use client';

import { Suspense } from 'react';
import PaymentSuccessContent from '@/components/payment-success-content';
import { Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div
      style={{
        background: '#f4f4f2',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily:
          'var(--font-inter), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        color: '#0a0a0c',
      }}
    >
      <Suspense fallback={<PaymentSuccessLoading />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}

function PaymentSuccessLoading() {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 22,
        boxShadow:
          '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)',
        padding: 40,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#f4f4f2',
          marginBottom: 18,
        }}
      >
        <Loader2 size={24} color="#6e6e76" className="animate-spin" />
      </div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: -0.3,
          margin: 0,
          color: '#0a0a0c',
        }}
      >
        Verifying your payment
      </h2>
      <p
        style={{
          fontSize: 13,
          color: '#6e6e76',
          marginTop: 6,
          marginBottom: 0,
        }}
      >
        Hang on a few seconds while we confirm the transaction.
      </p>
    </div>
  );
}
