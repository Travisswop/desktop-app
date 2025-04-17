'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { createPaymentIntent } from '@/lib/payment-actions';
import {
  deleteCartItem,
  updateCartQuantity,
} from '@/actions/addToCartActions';
import { useUser } from '@/lib/UserContext';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Check, Loader, Minus, Plus, CircleX } from 'lucide-react';
import { useDisclosure } from '@nextui-org/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NftPaymentModal from '@/components/modal/NftPayment';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Make sure environment variable exists before using it
const STRIPE_KEY =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    : '';

// Load Stripe only once in client environment
let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripePromise = () => {
  if (!stripePromise && STRIPE_KEY) {
    stripePromise = loadStripe(STRIPE_KEY);
  }
  return stripePromise;
};

// Types
interface CustomerInfo {
  email: string;
  name: string;
  phone: string;
  useSwopId: boolean;
  ens?: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface CartItem {
  _id: string;
  quantity: number;
  nftTemplate: {
    name: string;
    price: number;
    image: string;
    ownerAddress: string;
  };
}

interface CartData {
  state: string;
  data: {
    cartItems: CartItem[];
  };
}

interface StripePaymentFormProps {
  email: string;
  subtotal: number;
  isPaymentSheetOpen: boolean;
  setIsPaymentSheetOpen: (isOpen: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  customerInfo: CustomerInfo;
}

interface CartCheckoutProps {
  data: CartData;
  accessToken: string;
}

// Loading state component for better UX
const LoadingSpinner = () => (
  <div className="flex justify-center py-6">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
  </div>
);

// Stripe payment component - This needs to be inside Elements context
const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  email,
  subtotal,
  isPaymentSheetOpen,
  setIsPaymentSheetOpen,
  setErrorMessage,
  customerInfo,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [payLoading, setPayLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setPayLoading(true);
    setErrorMessage(null);

    try {
      // Confirm the payment with the card element
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
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
      setPayLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex-1 overflow-y-auto p-4">
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            paymentMethodOrder: ['card'],
            defaultValues: {
              billingDetails: {
                email: email,
              },
            },
          }}
        />
      </div>
      <div className="p-4">
        <Button
          onClick={handleSubmit}
          disabled={!stripe || payLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {payLoading ? 'Processing...' : `Pay ${subtotal} USDC`}
        </Button>
      </div>
    </div>
  );
};

interface CartItemsListProps {
  cartItems: CartItem[];
  loadingOperations: Record<
    string,
    { updating: boolean; deleting: boolean }
  >;
  onUpdate: (item: CartItem, type: 'inc' | 'dec') => void;
  onRemove: (id: string) => void;
}
export const CartItemsList: React.FC<CartItemsListProps> = ({
  cartItems,
  loadingOperations,
  onUpdate,
  onRemove,
}) => (
  <div className="flex flex-col gap-2 w-full mb-6">
    {cartItems.length > 0 ? (
      cartItems.map((item) => {
        const isUpdating = loadingOperations[item._id]?.updating;
        const isDeleting = loadingOperations[item._id]?.deleting;
        return (
          <div
            key={item._id}
            className="bg-white shadow-medium rounded-xl w-full flex items-center gap-6 justify-between p-3 relative"
          >
            <div className="flex items-center gap-3">
              <Image
                src={item.nftTemplate.image}
                alt={item.nftTemplate.name}
                width={320}
                height={320}
                className="w-32 h-auto rounded"
                loading="lazy"
              />
              <div>
                <p className="text-lg font-semibold mb-1">
                  {item.nftTemplate.name}
                </p>
                <p>${item.nftTemplate.price}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-black">
              <button
                onClick={() => onUpdate(item, 'dec')}
                disabled={isUpdating || item.quantity <= 1}
                className="p-1 disabled:opacity-50"
                aria-label="Decrease quantity"
              >
                <Minus size={20} />
              </button>
              <span className="w-6 flex justify-center">
                {isUpdating ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  item.quantity
                )}
              </span>
              <button
                onClick={() => onUpdate(item, 'inc')}
                disabled={isUpdating}
                className="p-1 disabled:opacity-50"
                aria-label="Increase quantity"
              >
                <Plus size={20} />
              </button>
            </div>
            <button
              onClick={() => onRemove(item._id)}
              className="absolute top-2 right-2 p-1"
              disabled={isDeleting}
              aria-label="Remove item"
            >
              {isDeleting ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <CircleX size={18} />
              )}
            </button>
          </div>
        );
      })
    ) : (
      <div className="text-lg font-semibold py-10 text-center">
        <p>No Items Found!</p>
        <p className="font-medium text-gray-600">
          Please add an item to continue
        </p>
      </div>
    )}
  </div>
);

/** 2) CHECKOUT CARD **/
interface CheckoutCardProps {
  user: ReturnType<typeof useUser>['user'] | null;
  customerInfo: CustomerInfo;
  toggleUseSwopId: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCountryChange: (value: string) => void;
  handleOpenPaymentSheet: () => void;
  errorMessage: string | null;
  cartItems: CartItem[];
  subtotal: number;
  onOpen: () => void;
}
export const CheckoutCard: React.FC<CheckoutCardProps> = ({
  user,
  customerInfo,
  toggleUseSwopId,
  handleInputChange,
  handleCountryChange,
  handleOpenPaymentSheet,
  errorMessage,
  cartItems,
  subtotal,
  onOpen,
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

      {/* Shipping Address */}
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
                {required && <span className="text-red-500">*</span>}
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
                Postal Code <span className="text-red-500">*</span>
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
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
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
        onClick={onOpen}
        type="button"
        className="bg-slate-600 hover:bg-slate-700 text-white py-2 w-full font-medium"
      >
        Pay With Wallet
      </Button>
      <Button
        onClick={handleOpenPaymentSheet}
        disabled={!customerInfo.email}
        className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-medium"
      >
        Pay With Card
      </Button>
    </CardFooter>
  </Card>
);

/** 3) ERROR DISPLAY **/
interface ErrorDisplayProps {
  error: string;
}
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
}) => (
  <div className="bg-white p-6 rounded-lg shadow-md w-full my-4">
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
);

const CartCheckout: React.FC<CartCheckoutProps> = ({
  data,
  accessToken,
}) => {
  const { user } = useUser();
  const params = useParams();
  const name = params.username as string;

  // State variables
  const [clientSecret, setClientSecret] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState<
    Record<string, { updating: boolean; deleting: boolean }>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  // Customer information state with proper default values
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    email: user?.email || '',
    name: user?.name || '',
    phone: user?.mobileNo || '',
    ens: user?.ensName || '',
    useSwopId: false,
    address: {
      line1: user?.address || '',
      line2: user?.apt || '',
      city: '',
      state: '',
      postalCode: '',
      country: user?.countryCode || 'US',
    },
  });

  // NFT wallet payment modal state
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Parse cart items with proper error handling
  const cartItems: CartItem[] = useMemo(() => {
    return data?.state === 'success' &&
      Array.isArray(data?.data?.cartItems)
      ? data.data.cartItems
      : [];
  }, [data]);

  // Use memoized values to prevent unnecessary recalculations
  const subtotal = useMemo(() => {
    if (!cartItems.length) return 0;

    return cartItems.reduce((total, item) => {
      return (
        total +
        (item?.nftTemplate?.price || 0) * (item?.quantity || 0)
      );
    }, 0);
  }, [cartItems]);

  const sellerAddress = useMemo(() => {
    return cartItems.length > 0
      ? cartItems[0]?.nftTemplate?.ownerAddress
      : '';
  }, [cartItems]);

  // Initialize payment only when necessary
  useEffect(() => {
    const initializePayment = async () => {
      if (subtotal <= 0 || clientSecret) return;

      try {
        setLoading(true);
        setError(null);
        const { clientSecret: secret } = await createPaymentIntent(
          Math.round(subtotal * 1000)
        );
        setClientSecret(secret);
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
  }, [subtotal, clientSecret]);

  // Update customer info when user changes
  useEffect(() => {
    if (user && customerInfo.useSwopId) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.mobileNo || prev.phone,
        email: user.email || prev.email,
        ens: user.ensName || prev.ens,
        address: {
          ...prev.address,
          country: user.countryCode || prev.address.country,
          line1: user.address || prev.address.line1,
          line2: user.apt || prev.address.line2,
        },
      }));
    }
  }, [user, customerInfo.useSwopId]);

  // Handlers for cart operations - memoized to prevent re-creation on renders
  const handleUpdateQuantity = useCallback(
    async (item: CartItem, type: 'inc' | 'dec') => {
      try {
        // Update local state first for immediate feedback
        setLoadingOperations((prev) => ({
          ...prev,
          [item._id]: { ...prev[item._id], updating: true },
        }));

        const newQuantity =
          type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        if (newQuantity < 1) return;

        const payload = {
          cartId: item._id,
          quantity: newQuantity,
        };

        if (name) {
          await updateCartQuantity(payload, accessToken, name);
        }
      } catch (error) {
        console.error('Error updating quantity:', error);
        setErrorMessage('Failed to update quantity');
      } finally {
        // Use a shorter timeout or remove for production
        setTimeout(() => {
          setLoadingOperations((prev) => ({
            ...prev,
            [item._id]: { ...prev[item._id], updating: false },
          }));
        }, 500);
      }
    },
    [name, accessToken]
  );

  const handleRemoveItem = useCallback(
    async (id: string) => {
      try {
        setLoadingOperations((prev) => ({
          ...prev,
          [id]: { ...prev[id], deleting: true },
        }));

        await deleteCartItem(id, accessToken, name);
      } catch (error) {
        console.error('Error removing item:', error);
        setErrorMessage('Failed to remove item');
      } finally {
        setTimeout(() => {
          setLoadingOperations((prev) => ({
            ...prev,
            [id]: { ...prev[id], deleting: false },
          }));
        }, 500);
      }
    },
    [name, accessToken]
  );

  const handleCountryChange = useCallback((value: string) => {
    setCustomerInfo((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        country: value,
      },
    }));
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setCustomerInfo((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent as keyof typeof prev],
            [child]: value,
          },
        }));
      } else {
        setCustomerInfo((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    },
    []
  );

  const toggleUseSwopId = useCallback(() => {
    setCustomerInfo((prev) => {
      const newUseSwopId = !prev.useSwopId;

      if (newUseSwopId && user) {
        return {
          ...prev,
          useSwopId: newUseSwopId,
          name: user.name || prev.name,
          phone: user.mobileNo || prev.phone,
          email: user.email || prev.email,
          ens: user.ensName || prev.ens,
          address: {
            ...prev.address,
            country: user.countryCode || prev.address.country,
            line1: user.address || prev.address.line1,
            line2: user.apt || prev.address.line2,
          },
        };
      }

      return {
        ...prev,
        useSwopId: newUseSwopId,
      };
    });
  }, [user]);

  // Validation function for form fields
  const validateFormFields = useCallback(() => {
    const requiredFields = [
      {
        field: customerInfo.email,
        message: 'Please enter your email address',
      },
      { field: customerInfo.name, message: 'Please enter your name' },
      {
        field: customerInfo.phone,
        message: 'Please enter your phone number',
      },
      {
        field: customerInfo.address.line1,
        message: 'Please enter your address',
      },
      {
        field: customerInfo.address.city,
        message: 'Please enter your city',
      },
      {
        field: customerInfo.address.state,
        message: 'Please enter your state/province',
      },
      {
        field: customerInfo.address.postalCode,
        message: 'Please enter your postal code',
      },
    ];

    for (const { field, message } of requiredFields) {
      if (!field || field.trim() === '') {
        setErrorMessage(message);
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }

    setErrorMessage(null);
    return true;
  }, [customerInfo]);

  const handleOpenPaymentSheet = useCallback(() => {
    if (validateFormFields()) {
      setIsPaymentSheetOpen(true);
    }
  }, [validateFormFields]);

  // Main conditional rendering
  if (loading && !clientSecret && subtotal > 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-md">
      {/* Cart Items Display */}
      <CartItemsList
        cartItems={cartItems}
        loadingOperations={loadingOperations}
        onUpdate={handleUpdateQuantity}
        onRemove={handleRemoveItem}
      />

      {subtotal > 0 && cartItems.length > 0 ? (
        <CheckoutCard
          user={user}
          customerInfo={customerInfo}
          toggleUseSwopId={toggleUseSwopId}
          handleInputChange={handleInputChange}
          handleCountryChange={handleCountryChange}
          handleOpenPaymentSheet={handleOpenPaymentSheet}
          errorMessage={errorMessage}
          cartItems={cartItems}
          subtotal={subtotal}
          onOpen={onOpen}
        />
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : null}

      {/* NFT Payment Modal */}
      <NftPaymentModal
        subtotal={subtotal}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        sellerAddress={sellerAddress}
      />

      {/* Payment Sheet - Only rendered when clientSecret exists */}
      {clientSecret && (
        <Elements
          stripe={getStripePromise()}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
            },
          }}
        >
          <Sheet
            open={isPaymentSheetOpen}
            onOpenChange={setIsPaymentSheetOpen}
          >
            <SheetContent
              side="bottom"
              className="h-[90vh] sm:max-w-full p-0 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Payment</h2>
                  <p className="text-sm text-gray-600">
                    Complete your purchase securely with Stripe.
                  </p>
                </div>
              </div>
              <StripePaymentForm
                email={customerInfo.email}
                subtotal={subtotal}
                isPaymentSheetOpen={isPaymentSheetOpen}
                setIsPaymentSheetOpen={setIsPaymentSheetOpen}
                setErrorMessage={setErrorMessage}
                customerInfo={customerInfo}
              />
            </SheetContent>
          </Sheet>
        </Elements>
      )}
    </div>
  );
};

export default CartCheckout;
