'use client';

import React, { useEffect, useState } from 'react';
import {
  PaymentElement,
  useElements,
  useStripe,
  AddressElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import {
  createOrder,
  updateOrderPayment,
} from '@/actions/orderActions';

import {
  StripePaymentFormProps,
  CartItem,
  PaymentMethod,
  Status,
} from './types';
const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  email,
  subtotal,
  setIsPaymentSheetOpen,
  setErrorMessage,
  customerInfo,
  clientSecret,
  accessToken,
  orderId,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const [processing, setProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // If returning from a redirect, handle payment result
    stripe
      .retrievePaymentIntent(clientSecret)
      .then(({ paymentIntent }) => {
        if (!paymentIntent) return;

        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage('Payment succeeded!');
            // Here you would save payment details, but this runs after redirect
            break;
          case 'processing':
            setMessage('Your payment is processing.');
            break;
          default:
            setMessage('Something went wrong.');
            break;
        }
      });
  }, [clientSecret, stripe]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !orderId) {
      // Stripe.js hasn't loaded yet or orderId is missing
      setErrorMessage(
        'Payment system is initializing. Please try again.'
      );
      return;
    }

    setProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?orderId=${orderId}&username=${username}`,
        payment_method_data: {
          billing_details: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: {
              line1: customerInfo.address.line1,
              line2: customerInfo.address.line2 || undefined,
              city: customerInfo.address.city,
              state: customerInfo.address.state,
              postal_code: customerInfo.address.postalCode,
              country: customerInfo.address.country,
            },
          },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      try {
        const paymentInfo = {
          paymentIntentId: paymentIntent?.id,
          status: 'failed' as const,
        };
        await updateOrderPayment(orderId, paymentInfo, accessToken);
        
        // Redirect to payment failed page with error details
        const errorMessage = error.message || 'Payment failed. Please try again.';
        router.push(`/payment-failed?orderId=${orderId}&message=${encodeURIComponent(errorMessage)}&username=${username}`);
      } catch (updateError) {
        console.error('Error updating failed payment:', updateError);
      }
      
      console.error('Payment error:', error);
      setErrorMessage(
        error.message || 'Payment failed. Please try again.'
      );
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // This is where you save the payment details
      try {
        const paymentInfo = {
          paymentIntentId: paymentIntent.id,
          status: 'completed' as const, // Type assertion to match the expected type
        };

        // Call the updateOrderPayment function to save payment details
        const result = await updateOrderPayment(
          orderId,
          paymentInfo,
          accessToken
        );

        if (result.success) {
          // Payment details saved successfully
          setIsPaymentSheetOpen(false);
          setMessage('Payment successful!');

          // Redirect to success page or show success message
          if (result.redirectUrl) {
            window.location.href = result.redirectUrl;
          } else {
            router.push(`/payment-success?orderId=${orderId}&username=${username}&payment_intent=${paymentIntent.id}`);
          }
        } else {
          // Handle error saving payment details
          setErrorMessage(
            result.error || 'Failed to update payment information'
          );
        }
      } catch (error) {
        console.error('Error saving payment details:', error);
        setErrorMessage(
          'Payment processed but failed to save details. Please contact support.'
        );
      }
    } else if (paymentIntent) {
      // Handle other payment intent statuses
      setMessage(
        `Payment status: ${paymentIntent.status}. Please wait or try again.`
      );
    } else {
      setErrorMessage(
        'Payment processing incomplete. Please try again.'
      );
    }

    setProcessing(false);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <form
        id="payment-form"
        onSubmit={handleSubmit}
        className="space-y-4"
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

  // return (
  //   <div className="mt-6">
  //     <div className="flex-1 overflow-y-auto p-4">
  //       <PaymentElement
  //         options={{
  //           layout: {
  //             type: 'tabs',
  //             defaultCollapsed: false,
  //           },
  //           paymentMethodOrder: ['card'],
  //           defaultValues: {
  //             billingDetails: {
  //               email: email,
  //             },
  //           },
  //         }}
  //       />
  //     </div>
  //     <div className="p-4">
  //       <Button
  //         onClick={handleSubmit}
  //         disabled={!stripe || payLoading}
  //         className="w-full bg-blue-600 hover:bg-blue-700 text-white"
  //       >
  //         {payLoading ? 'Processing...' : `Pay $${subtotal}`}
  //       </Button>
  //     </div>
  //   </div>
  // );
};

export default StripePaymentForm;
