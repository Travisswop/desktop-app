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
import { XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [retryUrl, setRetryUrl] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');
    const orderIdParam = searchParams.get('orderId');
    const username = searchParams.get('username');
    
    if (orderIdParam) {
      setOrderId(orderIdParam);
    }
    
    if (username) {
      setRetryUrl(`/sp/${username}/cart`);
    } else {
      setRetryUrl('/');
    }
    
    if (errorMessage) {
      setErrorDetails(errorMessage);
    } else if (error) {
      setErrorDetails(error);
    } else {
      setErrorDetails('An unknown error occurred during payment processing.');
    }
  }, [searchParams]);

  const handleRetry = () => {
    if (retryUrl) {
      router.push(retryUrl);
    } else {
      router.push('/');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-red-600">
          Payment Failed
        </CardTitle>
        <CardDescription className="text-center">
          We couldn't process your payment
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center p-6">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        
        <div className="text-center mb-4">
          <p className="mb-2">
            There was an issue processing your payment.
          </p>
          {errorDetails && (
            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <p className="text-sm text-red-700">{errorDetails}</p>
              </div>
            </div>
          )}
        </div>

        {orderId && (
          <p className="text-sm text-gray-500 mt-2">
            Order ID: {orderId}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button 
          onClick={handleRetry}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Return to Home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
