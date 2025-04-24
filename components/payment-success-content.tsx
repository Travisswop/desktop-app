'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, XCircle, ShoppingCart } from 'lucide-react';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<
    'success' | 'processing' | 'error' | 'loading'
  >('loading');
  const [paymentIntentId, setPaymentIntentId] = useState<
    string | null
  >(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const paymentIntentClientSecret = searchParams.get(
      'payment_intent_client_secret'
    );
    const paymentIntent = searchParams.get('payment_intent');
    const orderIdParam = searchParams.get('orderId');
    const usernameParam = searchParams.get('username');

    if (orderIdParam) {
      setOrderId(orderIdParam);
    }

    if (usernameParam) {
      setUsername(usernameParam);
    }

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
              if (orderIdParam && usernameParam) {
                router.push(
                  `/payment-failed?orderId=${orderIdParam}&message=Payment%20method%20failed&username=${usernameParam}`
                );
              }
              break;
            default:
              setStatus('error');
              break;
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-green-600">
          Payment{' '}
          {status === 'loading'
            ? 'Processing'
            : status === 'success'
            ? 'Successful'
            : status === 'processing'
            ? 'Processing'
            : 'Failed'}
        </CardTitle>
        <CardDescription className="text-center">
          {status === 'success'
            ? 'Your order has been confirmed'
            : status === 'processing'
            ? 'Your payment is being processed'
            : status === 'loading'
            ? 'Checking payment status...'
            : 'There was an issue with your payment'}
        </CardDescription>
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
            {orderId && (
              <p className="text-sm text-gray-500 mt-2">
                Order ID: {orderId}
              </p>
            )}
            {paymentIntentId && (
              <p className="text-sm text-gray-500 mt-1">
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
              Your payment is still processing. We&apos;ll update you
              when it&apos;s complete.
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

      <CardFooter className="flex flex-col gap-2">
        <Button
          asChild
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Link href={username ? `/sp/${username}` : '/'}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>

        {orderId && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/order/${orderId}`}>View Order Details</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
