'use client';

import React from 'react';
import { Check } from 'lucide-react';
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

const CheckoutCard: React.FC<CheckoutCardProps> = ({
  user,
  customerInfo,
  toggleUseSwopId,
  handleInputChange,
  handleCountryChange,
  handleOpenPaymentSheet,
  errorMessage,
  cartItems,
  subtotal,
  handleOpenWalletPayment,
  hasPhygitalProducts,
}) => (
  <Card className="w-full shadow-lg bg-white mb-6">
    <CardHeader className="border-b">
      <div className="text-lg font-semibold">Checkout</div>
    </CardHeader>
    <CardContent>
      {/* Contact Info */}
      <div className="py-2">
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
                className="h-5 w-5 rounded border border-gray-300 flex items-center justify-center bg-white cursor-pointer"
                onClick={toggleUseSwopId}
                role="checkbox"
                aria-checked={customerInfo.useSwopId}
                tabIndex={0}
              >
                {customerInfo.useSwopId && (
                  <Check className="h-3.5 w-3.5 text-black" />
                )}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {['email', 'name', 'phone'].map((field) => (
            <div key={field}>
              <Label
                htmlFor={field}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {field === 'name'
                  ? 'Full Name'
                  : field.charAt(0).toUpperCase() + field.slice(1)}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id={field}
                name={field}
                type={field === 'phone' ? 'tel' : 'text'}
                value={(customerInfo as any)[field]}
                onChange={handleInputChange}
                placeholder={
                  field === 'email'
                    ? 'you@email.com'
                    : field === 'phone'
                    ? '+1 (555) 123-4567'
                    : 'John Doe'
                }
                required
                className="w-full"
                aria-required="true"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address - Only shown for phygital products */}
      {hasPhygitalProducts && (
        <>
          <div className="py-2 border-t">
            <h3 className="text-sm font-medium mb-4 text-gray-700">
              Shipping Address
            </h3>
            <div className="space-y-4">
              {[
                {
                  id: 'address.line1',
                  label: 'Address Line 1',
                  required: true,
                },
                {
                  id: 'address.line2',
                  label: 'Address Line 2 (Optional)',
                  required: false,
                },
              ].map(({ id, label, required }) => (
                <div key={id}>
                  <Label
                    htmlFor={id}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {label}{' '}
                    {required && (
                      <span className="text-red-500">*</span>
                    )}
                  </Label>
                  <Input
                    id={id}
                    name={id}
                    type="text"
                    value={id
                      .split('.')
                      .reduce((o, k) => (o as any)[k], customerInfo)}
                    onChange={handleInputChange}
                    placeholder={required ? '123 Main St' : 'Apt 4B'}
                    required={required}
                    className="w-full"
                    aria-required={required}
                  />
                </div>
              ))}

              {/* City / State */}
              <div className="grid grid-cols-2 gap-4">
                {['city', 'state'].map((fld) => (
                  <div key={fld}>
                    <Label
                      htmlFor={`address.${fld}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {fld.charAt(0).toUpperCase() + fld.slice(1)}{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`address.${fld}`}
                      name={`address.${fld}`}
                      type="text"
                      value={(customerInfo.address as any)[fld]}
                      onChange={handleInputChange}
                      placeholder={fld === 'city' ? 'New York' : 'NY'}
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
                    Postal Code{' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address.postalCode"
                    name="address.postalCode"
                    type="text"
                    value={customerInfo.address.postalCode}
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
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={customerInfo.address.country}
                    onValueChange={handleCountryChange}
                  >
                    <SelectTrigger id="address.country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">
                        United States
                      </SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">
                        United Kingdom
                      </SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="BD">Bangladesh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          <div className="py-2 border-t">
            <h3 className="text-sm font-medium mb-2 text-gray-700">
              Shipping Method
            </h3>
            <div className="bg-gray-100 p-3 rounded-md">
              <div className="font-medium">Free shipping</div>
              <div className="text-sm text-gray-500">
                5-7 business days
              </div>
            </div>
          </div>
        </>
      )}

      {/* Order Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">
            Subtotal ({cartItems.length} items)
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
      </div>
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
      <Button
        onClick={handleOpenWalletPayment}
        type="button"
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 w-full font-medium"
      >
        Pay With Wallet
      </Button>
      <Button
        onClick={handleOpenPaymentSheet}
        disabled={!customerInfo.email}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        Pay With Card
      </Button>
    </CardFooter>
  </Card>
);

export default CheckoutCard;
