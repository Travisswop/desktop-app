'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useRouter, useParams } from 'next/navigation';
import { updateOrderPayment } from '@/actions/orderActions';
import toast from 'react-hot-toast';

import { StripePaymentFormProps } from './types';

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  email,
  subtotal,
  setIsPaymentSheetOpen,
  setErrorMessage,
  customerInfo,
  clientSecret,
  accessToken,
  orderId,
  cartItems,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const [processing, setProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe || !clientSecret) return;

    stripe
      .retrievePaymentIntent(clientSecret)
      .then(({ paymentIntent }) => {
        if (!paymentIntent) return;

        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage('Payment succeeded!');
            break;
          case 'processing':
            setMessage('Your payment is processing.');
            break;
          case 'requires_payment_method':
            // Don't show any message in this case - it's the initial state
            break;
          default:
            setMessage('Something went wrong.');
            break;
        }
      })
      .catch((error) => {
        console.error('Error retrieving payment intent:', error);
      });
  }, [clientSecret, stripe]);

  // Handle updating payment status in the database
  const updatePaymentStatus = useCallback(
    async (
      paymentIntentId: string,
      status: 'completed' | 'failed'
    ) => {
      if (!orderId)
        return { success: false, error: 'No order ID provided' };

      try {
        const paymentInfo = { paymentIntentId, status };
        return await updateOrderPayment(
          orderId,
          paymentInfo,
          accessToken
        );
      } catch (error) {
        console.error(`Error updating ${status} payment:`, error);
        return {
          success: false,
          error: `Failed to update payment status: ${error}`,
        };
      }
    },
    [orderId, accessToken]
  );

  // Handle redirect to success or failure page
  const redirectToResultPage = useCallback(
    (
      success: boolean,
      paymentIntentId?: string,
      errorMessage?: string
    ) => {
      const baseUrl = success
        ? '/payment-success'
        : '/payment-failed';
      const params = new URLSearchParams();

      params.append('orderId', orderId || '');
      params.append('username', username);

      if (success && paymentIntentId) {
        params.append('payment_intent', paymentIntentId);
      }

      if (!success && errorMessage) {
        params.append('message', errorMessage);
      }

      router.push(`${baseUrl}?${params.toString()}`);
    },
    [orderId, username, router]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !orderId) {
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          receipt_email: email,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(
          error.message || 'An error occurred during payment'
        );
        toast.error(
          error.message || 'Payment failed. Please try again.'
        );
      } else if (
        paymentIntent &&
        paymentIntent.status === 'succeeded'
      ) {
        await updateOrderPayment(
          orderId,
          {
            paymentIntentId: paymentIntent.id,
            status: 'completed',
          },
          accessToken
        );
        toast.success('Payment successful!');
        setIsPaymentSheetOpen(false);
        redirectToResultPage(true, paymentIntent.id);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage('An unexpected error occurred');
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <form
        id="payment-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Payment element will collect card details */}
        <PaymentElement
          id="payment-element"
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            paymentMethodOrder: ['card'],
            defaultValues: {
              billingDetails: {
                email: email,
                name: customerInfo.name,
                phone: customerInfo.phone,
              },
            },
          }}
        />

        {/* Show any errors or messages */}
        {message && (
          <div className="text-sm text-green-600">{message}</div>
        )}

        {/* Order Confirmation */}
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm font-medium mb-2">
            Order Confirmation
          </p>
          <p className="text-xs text-gray-600 mb-1">
            You are about to complete your purchase of{' '}
            {cartItems?.length || 0} item(s) for a total of $
            {subtotal.toFixed(2)}.
          </p>
          <p className="text-xs text-gray-600">
            This charge will appear on your statement as SWOP.
          </p>
        </div>

        {/* Submit button */}
        <button
          disabled={processing || !stripe || !elements}
          type="submit"
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-md transition-colors flex items-center justify-center"
        >
          {processing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            `Pay $${subtotal.toFixed(2)}`
          )}
        </button>

        {/* Cancel button */}
        <button
          type="button"
          onClick={() => setIsPaymentSheetOpen(false)}
          className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors"
          disabled={processing}
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default StripePaymentForm;
