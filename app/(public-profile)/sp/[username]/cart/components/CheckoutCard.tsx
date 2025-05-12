'use client';

import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckoutCardProps } from './types';

// Field configurations for DRY approach
const CONTACT_FIELDS = [
  {
    id: 'email',
    label: 'Email',
    type: 'text',
    placeholder: 'you@email.com',
    required: true,
  },
  {
    id: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'John Doe',
    required: true,
  },
  {
    id: 'phone',
    label: 'Phone',
    type: 'tel',
    placeholder: '+1 (555) 123-4567',
    required: true,
  },
];

const ADDRESS_FIELDS = [
  {
    id: 'address.line1',
    label: 'Address Line 1',
    type: 'text',
    placeholder: '123 Main St',
    required: true,
  },
  {
    id: 'address.line2',
    label: 'Address Line 2 (Optional)',
    type: 'text',
    placeholder: 'Apt 4B',
    required: false,
  },
];

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'BD', label: 'Bangladesh' },
];

const CheckoutCard: React.FC<CheckoutCardProps> = ({
  user,
  customerInfo,
  toggleUseSwopId,
  handleInputChange,
  handleCountryChange,
  handleOpenPaymentSheet,
  handleOpenWalletPayment,
  errorMessage,
  cartItems,
  subtotal,
  hasPhygitalProducts,
}) => {
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isCardLoading, setIsCardLoading] = useState(false);

  const handleWalletPayment = async () => {
    setIsWalletLoading(true);
    try {
      await handleOpenWalletPayment();
    } finally {
      setIsWalletLoading(false);
    }
  };

  const handleCardPayment = async () => {
    setIsCardLoading(true);
    try {
      await handleOpenPaymentSheet();
    } finally {
      setIsCardLoading(false);
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    return (
      path.split('.').reduce((acc, part) => acc?.[part], obj) || ''
    );
  };

  return (
    <Card className="w-full shadow-lg bg-white my-4">
      <CardHeader className="border-b">
        <div className="text-lg font-semibold">Checkout</div>
      </CardHeader>

      <CardContent>
        {/* Contact Information Section */}
        <section className="py-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">
              Contact Information
            </h3>
            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Use Swop.ID
                </span>
                <div
                  className="h-5 w-5 rounded border border-gray-300 flex items-center justify-center bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={toggleUseSwopId}
                  role="checkbox"
                  aria-checked={customerInfo.useSwopId}
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && toggleUseSwopId()
                  }
                >
                  {customerInfo.useSwopId && (
                    <Check className="h-3.5 w-3.5 text-black" />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {CONTACT_FIELDS.map((field) => (
              <div key={field.id}>
                <Label
                  htmlFor={field.id}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  value={String(
                    customerInfo[
                      field.id as keyof typeof customerInfo
                    ] || ''
                  )}
                  onChange={handleInputChange}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Shipping Address Section - Only shown for phygital products */}
        {hasPhygitalProducts && (
          <>
            <section className="py-2 border-t">
              <h3 className="text-sm font-medium mb-4 text-gray-700">
                Shipping Address
              </h3>
              <div className="space-y-4">
                {/* Address Lines */}
                {ADDRESS_FIELDS.map((field) => (
                  <div key={field.id}>
                    <Label
                      htmlFor={field.id}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      value={getNestedValue(customerInfo, field.id)}
                      onChange={handleInputChange}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full"
                    />
                  </div>
                ))}

                {/* City / State */}
                <div className="grid grid-cols-2 gap-4">
                  {['city', 'state'].map((field) => (
                    <div key={field}>
                      <Label
                        htmlFor={`address.${field}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {field.charAt(0).toUpperCase() +
                          field.slice(1)}
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id={`address.${field}`}
                        name={`address.${field}`}
                        type="text"
                        value={
                          customerInfo.address?.[
                            field as keyof typeof customerInfo.address
                          ] || ''
                        }
                        onChange={handleInputChange}
                        placeholder={
                          field === 'city' ? 'New York' : 'NY'
                        }
                        required
                        className="w-full"
                        aria-required="true"
                      />
                    </div>
                  ))}
                </div>

                {/* Postal / Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="address.postalCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Postal Code
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="address.postalCode"
                      name="address.postalCode"
                      type="text"
                      value={customerInfo.address?.postalCode || ''}
                      onChange={handleInputChange}
                      placeholder="10001"
                      required
                      className="w-full"
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="address.country"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Country
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={customerInfo.address?.country || ''}
                      onValueChange={handleCountryChange}
                    >
                      <SelectTrigger id="address.country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem
                            key={country.value}
                            value={country.value}
                          >
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            {/* Shipping Method */}
            <section className="py-2 border-t">
              <h3 className="text-sm font-medium mb-2 text-gray-700">
                Shipping Method
              </h3>
              <div className="bg-gray-100 p-3 rounded-md">
                <div className="font-medium">Free shipping</div>
                <div className="text-sm text-gray-500">
                  5-7 business days
                </div>
              </div>
            </section>
          </>
        )}

        {/* Order Summary */}
        <section className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">
              Subtotal ({cartItems.length}{' '}
              {cartItems.length === 1 ? 'item' : 'items'})
            </span>
            <span>{subtotal} USDC</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Discount</span>
            <span>0 USDC</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{subtotal} USDC</span>
          </div>
        </section>
      </CardContent>

      <CardFooter className="flex flex-col space-y-3 p-4 border-t">
        {errorMessage && (
          <div
            className="text-red-500 text-sm p-2 bg-red-50 rounded w-full"
            role="alert"
          >
            {errorMessage}
          </div>
        )}
        {user && (
          <Button
            onClick={handleWalletPayment}
            disabled={!customerInfo.email || isWalletLoading}
            type="button"
            className="bg-black text-white py-2 w-full font-medium hover:bg-gray-800 transition-colors"
          >
            {isWalletLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay With Wallet'
            )}
          </Button>
        )}
        <Button
          onClick={handleCardPayment}
          disabled={!customerInfo.email || isCardLoading}
          className="w-full bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          {isCardLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay With Card'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CheckoutCard;
