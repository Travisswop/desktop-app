'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { createPaymentIntent } from '@/lib/payment-actions';
import {
  deleteCartItem,
  updateCartQuantity,
} from '@/actions/addToCartActions';
import { useUser } from '@/lib/UserContext';
import { useParams } from 'next/navigation';
import { useDisclosure } from '@nextui-org/react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import NftPaymentModal from '@/components/modal/NftPayment';

import {
  LoadingSpinner,
  StripePaymentForm,
  CartItemsList,
  CheckoutCard,
  ErrorDisplay,
} from './components';
import {
  CartCheckoutProps,
  CartItem,
  CustomerInfo,
  PaymentMethod,
  Status,
} from './components/types';
import { createOrder } from '@/actions/orderActions';

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

const CartCheckout: React.FC<CartCheckoutProps> = ({
  data,
  accessToken,
}) => {
  const { user } = useUser();
  const params = useParams();
  const name = params.username as string;
  const orderIdRef = useRef<string | null>(null);

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
    wallet: {
      ens: user?.ensName || '',
      address: user?.solanaAddress || '',
    },
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

  console.log('customer info', customerInfo);

  // NFT wallet payment modal state
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Parse cart items with proper error handling
  const cartItems: CartItem[] = useMemo(() => {
    return data?.state === 'success' &&
      Array.isArray(data?.data?.cartItems)
      ? data.data.cartItems
      : [];
  }, [data]);

  const hasPhygitalProducts = useMemo(() => {
    return cartItems.some(
      (item) => item.nftTemplate.nftType === 'phygital'
    );
  }, [cartItems]);

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
        wallet: {
          ens: user.ensName || prev.wallet.ens,
          address: user.solanaAddress || prev.wallet.address,
        },
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
        setCustomerInfo((prev) => {
          if (parent === 'address') {
            return {
              ...prev,
              address: {
                ...prev.address,
                [child]: value,
              },
            };
          }
          return prev;
        });
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
          wallet: {
            ens: user.ensName || prev.wallet.ens,
            address: user.solanaAddress || prev.wallet.address,
          },
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
    ];

    if (hasPhygitalProducts) {
      requiredFields.push(
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
        }
      );
    }

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
  }, [customerInfo, hasPhygitalProducts, setErrorMessage]);

  const handleOpenPaymentSheet = useCallback(async () => {
    if (validateFormFields()) {
      try {
        const orderInfo = {
          customerInfo,
          items: cartItems.map((item: CartItem) => ({
            itemId: item._id,
            quantity: item.quantity,
            price: item.nftTemplate.price,
            name: item.nftTemplate.name,
            nftType: item.nftTemplate.nftType || 'collectible',
          })),
          subtotal,
          paymentMethod: 'stripe' as PaymentMethod,
          status: 'pending' as Status,
        };

        const { orderId } = await createOrder(orderInfo, accessToken);
        console.log(
          '🚀 ~ handleOpenPaymentSheet ~ orderId:',
          orderId
        );
        orderIdRef.current = orderId;
        setIsPaymentSheetOpen(true);
      } catch (error) {
        console.error('Error creating order:', error);
        setErrorMessage('Failed to create order. Please try again.');
      }
    }
  }, [
    validateFormFields,
    customerInfo,
    cartItems,
    subtotal,
    accessToken,
    setErrorMessage,
  ]);

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
          hasPhygitalProducts={hasPhygitalProducts}
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
              <SheetTitle className="sr-only">
                Payment Sheet
              </SheetTitle>
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
                setIsPaymentSheetOpen={setIsPaymentSheetOpen}
                setErrorMessage={setErrorMessage}
                customerInfo={customerInfo}
                cartItems={cartItems}
                accessToken={accessToken}
                orderId={orderIdRef.current}
                clientSecret={clientSecret}
              />
            </SheetContent>
          </Sheet>
        </Elements>
      )}
    </div>
  );
};

export default CartCheckout;
