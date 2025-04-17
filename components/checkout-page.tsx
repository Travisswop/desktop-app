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
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
        const { clientSecret } = await createPaymentIntent(
          totalAmount
        );
        setClientSecret(clientSecret);
      } catch (err) {
        console.error('Error initializing payment:', err);
        setError(
          'Could not initialize payment. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [totalAmount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-red-500 text-xl font-semibold mb-4">
            Payment Error
          </h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-red-500 text-xl font-semibold mb-4">
            Payment Not Available
          </h2>
          <p className="text-gray-700">
            Unable to initialize payment system. Please try again
            later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
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
