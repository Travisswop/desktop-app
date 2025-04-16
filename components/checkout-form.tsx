'use client';

import type React from 'react';

import { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { CartItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CheckoutFormProps {
  cartItems: CartItem[];
  totalAmount: number;
  clientSecret: string;
}

export default function CheckoutForm({
  cartItems,
  totalAmount,
  clientSecret,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );
  const [email, setEmail] = useState('');
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Confirm the payment with the card element
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          payment_method_data: {
            billing_details: {
              email: email,
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(
          error.message || 'An error occurred with your payment'
        );
        setIsPaymentSheetOpen(false);
      }
    } catch (error) {
      setErrorMessage(
        'An error occurred while processing your payment'
      );
      console.error('Payment error:', error);
      setIsPaymentSheetOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const handleOpenPaymentSheet = () => {
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }
    setIsPaymentSheetOpen(true);
  };

  return (
    <>
      <Card className="w-full shadow-lg bg-white">
        <CardHeader className="border-b">
          <div className="text-center font-bold text-xl">powdur</div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Cart Items */}
          <div className="p-4 bg-white rounded-t-lg">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded">
                    <img
                      src={item.image || '/placeholder.svg'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.description}
                    </div>
                  </div>
                </div>
                <div className="font-semibold">
                  {formatPrice(item.price)}
                </div>
              </div>
            ))}
          </div>

          {/* Email Input */}
          <div className="p-4 border-t">
            <div className="mb-4">
              <Label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Shipping Information */}
          <div className="p-4 border-t">
            <h3 className="text-sm font-medium mb-2 text-gray-700">
              Shipping
            </h3>
            <div className="bg-gray-100 p-3 rounded-md">
              <div className="font-medium">Free shipping</div>
              <div className="text-sm text-gray-500">
                5-7 business days
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 p-4 border-t">
          {errorMessage && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {errorMessage}
            </div>
          )}

          <Button
            onClick={handleOpenPaymentSheet}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading
              ? 'Processing...'
              : `Pay ${formatPrice(totalAmount)} now`}
          </Button>
        </CardFooter>
      </Card>

      {/* Payment Sheet */}
      <Sheet
        open={isPaymentSheetOpen}
        onOpenChange={setIsPaymentSheetOpen}
      >
        <SheetContent
          side="bottom"
          className="h-[80vh] sm:max-w-full"
        >
          <SheetHeader>
            <SheetTitle>Payment</SheetTitle>
            <SheetDescription>
              Complete your purchase securely with Stripe.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <PaymentElement />
            <Button
              onClick={handleSubmit}
              disabled={!stripe || isLoading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading
                ? 'Processing...'
                : `Pay ${formatPrice(totalAmount)} now`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
