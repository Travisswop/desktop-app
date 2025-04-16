'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    'success' | 'processing' | 'error' | 'loading'
  >('loading');
  const [paymentIntentId, setPaymentIntentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const paymentIntentClientSecret = searchParams.get(
      'payment_intent_client_secret'
    );
    const paymentIntent = searchParams.get('payment_intent');

    if (paymentIntentClientSecret && paymentIntent) {
      setPaymentIntentId(paymentIntent);

      const checkStatus = async () => {
        const stripe = await stripePromise;

        if (stripe) {
          const { paymentIntent } =
            await stripe.retrievePaymentIntent(
              paymentIntentClientSecret
            );

          switch (paymentIntent?.status) {
            case 'succeeded':
              setStatus('success');
              break;
            case 'processing':
              setStatus('processing');
              break;
            case 'requires_payment_method':
              setStatus('error');
              break;
            default:
              setStatus('error');
              break;
          }
        }
      };

      checkStatus();
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            Payment{' '}
            {status === 'loading'
              ? 'Processing'
              : status === 'success'
              ? 'Successful'
              : status === 'processing'
              ? 'Processing'
              : 'Failed'}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center p-6">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-center">
                Your payment was successful! Thank you for your
                purchase.
              </p>
              {paymentIntentId && (
                <p className="text-sm text-gray-500 mt-2">
                  Payment ID: {paymentIntentId}
                </p>
              )}
            </>
          )}

          {status === 'processing' && (
            <>
              <div className="animate-pulse flex space-x-4 mb-4">
                <div className="rounded-full bg-gray-300 h-12 w-12"></div>
              </div>
              <p className="text-center">
                Your payment is still processing. We&apos;ll update
                you when it&apos;s complete.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-center">
                There was an issue processing your payment. Please try
                again.
              </p>
            </>
          )}
        </CardContent>

        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/">Return to Checkout</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
