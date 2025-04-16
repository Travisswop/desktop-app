'use client';

import { Suspense } from 'react';
import PaymentSuccessContent from '@/components/payment-success-content';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Suspense fallback={<PaymentSuccessLoading />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}

function PaymentSuccessLoading() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-center text-gray-600">
            Processing your payment...
          </p>
        </div>
      </div>
    </div>
  );
}
