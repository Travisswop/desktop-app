'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from './checkout-form';
import type { CartItem } from '@/lib/types';
import { createPaymentIntent } from '@/lib/payment-actions';

// Load stripe outside of component render to avoid recreating stripe object on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Sample cart items
  const cartItems: CartItem[] = [
    {
      id: 'pure-set',
      name: 'Pure set',
      description: '1 × set',
      price: 6500, // in cents
      image: '/placeholder.svg?height=80&width=80',
    },
    {
      id: 'pure-glow',
      name: 'Pure glow',
      description: '1 × jar',
      price: 2500, // in cents
      image: '/placeholder.svg?height=80&width=80',
    },
  ];

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price,
    0
  );

  // Create payment intent when component mounts
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        const { clientSecret } = await createPaymentIntent(
          totalAmount
        );
        setClientSecret(clientSecret);
      } catch (error) {
        console.error('Error initializing payment:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [totalAmount]);

  if (loading || !clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md">
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
            },
          }}
        >
          <CheckoutForm
            cartItems={cartItems}
            totalAmount={totalAmount}
            clientSecret={clientSecret}
          />
        </Elements>
      </div>
    </div>
  );
}
