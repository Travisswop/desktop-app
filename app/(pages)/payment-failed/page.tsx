'use client';

import { Suspense } from 'react';
import PaymentFailedContent from '@/components/payment-failed-content';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Suspense fallback={<PaymentFailedLoading />}>
        <PaymentFailedContent />
      </Suspense>
    </div>
  );
}

function PaymentFailedLoading() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-center text-gray-600">
            Checking payment status...
          </p>
        </div>
      </div>
    </div>
  );
}
