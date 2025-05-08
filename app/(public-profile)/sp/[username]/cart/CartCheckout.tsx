'use client';

import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { createPaymentIntent } from '@/lib/payment-actions';
import { useUser } from '@/lib/UserContext';
import { useParams } from 'next/navigation';
import { useDisclosure } from '@nextui-org/react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import NftPaymentModal from '@/components/modal/NftPayment';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import { useCart } from './context/CartContext';
import { useCartPersistence } from './hooks/useCartPersistence';
import {
  CartItemsList,
  CheckoutCard,
  ErrorDisplay,
  LoadingSpinner,
  StripePaymentForm,
} from './components';
import {
  CustomerInfo,
  PaymentMethod,
  Status,
} from './components/types';
import { createOrder } from '@/actions/orderActions';
import {
  updateCartQuantity,
  deleteCartItem,
} from '@/actions/addToCartActions';
import toast from 'react-hot-toast';

// Environment variable constants
const STRIPE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Initialize Stripe only once
let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripePromise = () => {
  if (!stripePromise && STRIPE_KEY) {
    stripePromise = loadStripe(STRIPE_KEY);
  }
  return stripePromise;
};

// Helper function to clear cart from localStorage
const clearCartFromLocalStorage = (username: string) => {
  if (typeof window !== 'undefined' && username) {
    const storageKey = `marketplace-cart-${username}`;
    localStorage.removeItem(storageKey);
  }
};

const CartCheckout = () => {
  const { user, accessToken } = useUser();
  const { solanaWallets } = useSolanaWalletContext();
  const { state, dispatch, subtotal, sellerId } = useCart();
  const params = useParams();
  const name = params.username as string;
  const orderIdRef = React.useRef<string | null>(null);

  // Ensure we have a parentId to use for the order even if sellerId is missing
  const [localParentId, setLocalParentId] = useState<string | null>(
    null
  );

  // Try to get parentId from cart items if it's not available in the cart context
  useEffect(() => {
    if (!sellerId && state.items.length > 0) {
      const firstItemWithSellerId = state.items.find(
        (item) => item.sellerId
      );
      if (firstItemWithSellerId?.sellerId) {
        setLocalParentId(firstItemWithSellerId.sellerId);
      }
    } else if (sellerId) {
      setLocalParentId(sellerId);
    }
  }, [sellerId, state.items]);

  // Initialize cart persistence
  useCartPersistence();

  // State variables
  const [clientSecret, setClientSecret] = React.useState<
    string | null
  >(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] =
    React.useState(false);
  const [loadingOperations, setLoadingOperations] = React.useState<
    Record<string, { updating: boolean; deleting: boolean }>
  >({});
  const [errorMessage, setErrorMessage] = React.useState<
    string | null
  >(null);

  // Default customer information
  const defaultCustomerInfo: CustomerInfo = {
    email: '',
    name: '',
    phone: '',
    wallet: {
      ens: '',
      address:
        solanaWallets?.find(
          (w: any) => w.walletClientType === 'privy'
        )?.address || '',
    },
    useSwopId: false,
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
  };
  const [customerInfo, setCustomerInfo] =
    React.useState<CustomerInfo>(defaultCustomerInfo);

  // NFT wallet payment modal state
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [walletOrderId, setWalletOrderId] = React.useState<
    string | null
  >(null);

  // Check if any product requires physical shipping
  const hasPhygitalProducts = useMemo(() => {
    return state.items.some(
      (item) => item.nftTemplate?.nftType === 'phygital'
    );
  }, [state.items]);

  // Initialize payment
  useEffect(() => {
    const initializePayment = async () => {
      if (subtotal <= 0 || clientSecret) return;

      try {
        setLoading(true);
        setError(null);

        // Validate prices server-side before creating payment intent
        const { clientSecret: secret } = await createPaymentIntent(
          Math.round(subtotal * 100)
        );

        if (!secret) {
          throw new Error(
            'Failed to initialize payment. Please try again.'
          );
        }

        setClientSecret(secret);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Could not initialize payment. Please try again later.';
        setError(errorMessage);
        toast.error(errorMessage);
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
          address:
            solanaWallets?.find(
              (w: any) => w.walletClientType === 'privy'
            )?.address || prev.wallet.address,
        },
        address: {
          ...prev.address,
          country: user.countryCode || prev.address.country,
          line1: user.address || prev.address.line1,
          line2: user.apt || prev.address.line2,
        },
      }));
    }
  }, [user, customerInfo.useSwopId, solanaWallets]);

  // Handlers for cart operations
  const handleUpdateQuantity = useCallback(
    async (item: any, type: 'inc' | 'dec') => {
      const itemId = item._id;
      try {
        setLoadingOperations((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], updating: true },
        }));

        const newQuantity =
          type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        if (newQuantity < 1) return;

        if (accessToken && name) {
          await updateCartQuantity(
            { cartId: itemId, quantity: newQuantity },
            accessToken,
            name
          );
        }
        dispatch({
          type: 'UPDATE_QUANTITY',
          payload: { id: itemId, quantity: newQuantity },
        });
        toast.success('Cart updated successfully');
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update quantity';
        setErrorMessage(errorMessage);
        toast.error(errorMessage);
      } finally {
        setTimeout(() => {
          setLoadingOperations((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], updating: false },
          }));
        }, 300);
      }
    },
    [name, accessToken, dispatch]
  );

  const handleRemoveItem = useCallback(
    async (id: string) => {
      try {
        setLoadingOperations((prev) => ({
          ...prev,
          [id]: { ...prev[id], deleting: true },
        }));

        if (accessToken && name) {
          await deleteCartItem(id, accessToken, name);
        }
        dispatch({ type: 'REMOVE_ITEM', payload: id });
        toast.success('Item removed from cart');
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to remove item';
        setErrorMessage(errorMessage);
        toast.error(errorMessage);
      } finally {
        setTimeout(() => {
          setLoadingOperations((prev) => ({
            ...prev,
            [id]: { ...prev[id], deleting: false },
          }));
        }, 300);
      }
    },
    [name, accessToken, dispatch]
  );

  // Form handlers
  const handleCountryChange = useCallback((value: string) => {
    setCustomerInfo((prev) => ({
      ...prev,
      address: { ...prev.address, country: value },
    }));
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setCustomerInfo((prev) => {
        if (name.includes('.')) {
          const [parent, child] = name.split('.');
          if (parent === 'address') {
            return {
              ...prev,
              address: { ...prev.address, [child]: value },
            };
          }
          return prev;
        }
        return { ...prev, [name]: value };
      });
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
            address: prev.wallet.address,
          },
          address: {
            ...prev.address,
            country: user.countryCode || prev.address.country,
            line1: user.address || prev.address.line1,
            line2: user.apt || prev.address.line2,
          },
        };
      }
      return { ...prev, useSwopId: newUseSwopId };
    });
  }, [user]);

  // Validation function
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
        toast.error(message);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      setErrorMessage('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return false;
    }

    setErrorMessage(null);
    return true;
  }, [customerInfo, hasPhygitalProducts]);

  // Order creation
  const createOrderForPayment = useCallback(
    async (paymentMethod: PaymentMethod) => {
      if (!validateFormFields()) return null;

      try {
        setErrorMessage(null);
        const orderInfo = {
          customerInfo: {
            ...customerInfo,
            wallet: {
              ...customerInfo.wallet,
              address: solanaWallets?.find(
                (w: any) => w.walletClientType === 'privy'
              )?.address,
            },
          },
          cartItems: state.items,
          paymentMethod,
          status: 'pending' as Status,
          sellerId: sellerId || localParentId, // Use the local parentId as fallback
        };

        const { orderId } = await createOrder(orderInfo, accessToken);

        if (!orderId) {
          throw new Error(
            'Failed to create order. Please try again.'
          );
        }

        return orderId;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create order. Please try again.';
        setErrorMessage(errorMessage);
        toast.error(errorMessage);
        return null;
      }
    },
    [
      validateFormFields,
      customerInfo,
      state.items,
      accessToken,
      solanaWallets,
      sellerId,
      localParentId,
    ]
  );

  // Payment handlers
  const handleOpenWalletPayment = useCallback(async () => {
    try {
      const orderId = await createOrderForPayment('wallet');
      if (orderId) {
        setWalletOrderId(orderId);
        // Clear the cart when an order is successfully created
        dispatch({ type: 'CLEAR_CART' });
        // Clear from localStorage
        clearCartFromLocalStorage(name);
        onOpen();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process wallet payment';
      setErrorMessage(errorMessage);
      toast.error(errorMessage);
    }
  }, [createOrderForPayment, onOpen, dispatch, name]);

  const handleOpenPaymentSheet = useCallback(async () => {
    try {
      const orderId = await createOrderForPayment('stripe');
      if (orderId) {
        orderIdRef.current = orderId;
        // Don't clear cart yet - only store the order ID
        // We'll clear it after successful payment in StripePaymentForm

        if (!clientSecret) {
          try {
            setLoading(true);
            const { clientSecret: secret } =
              await createPaymentIntent(Math.round(subtotal * 100));

            if (!secret) {
              throw new Error('Failed to initialize payment');
            }

            setClientSecret(secret);
          } catch (paymentError) {
            const errorMessage =
              paymentError instanceof Error
                ? paymentError.message
                : 'Could not initialize payment. Please try again.';
            setErrorMessage(errorMessage);
            toast.error(errorMessage);
            return;
          } finally {
            setLoading(false);
          }
        }
        setIsPaymentSheetOpen(true);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process payment';
      setErrorMessage(errorMessage);
      toast.error(errorMessage);
    }
  }, [createOrderForPayment, clientSecret, subtotal, dispatch, name]);

  if (loading && !clientSecret && subtotal > 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-md">
      <CartItemsList
        cartItems={state.items}
        loadingOperations={loadingOperations}
        onUpdate={handleUpdateQuantity}
        onRemove={handleRemoveItem}
      />

      {subtotal > 0 && state.items.length > 0 ? (
        <CheckoutCard
          user={user}
          customerInfo={customerInfo}
          toggleUseSwopId={toggleUseSwopId}
          handleInputChange={handleInputChange}
          handleCountryChange={handleCountryChange}
          handleOpenPaymentSheet={handleOpenPaymentSheet}
          handleOpenWalletPayment={handleOpenWalletPayment}
          errorMessage={errorMessage}
          cartItems={state.items}
          subtotal={subtotal}
          hasPhygitalProducts={hasPhygitalProducts}
        />
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : null}

      <NftPaymentModal
        subtotal={subtotal}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        customerInfo={customerInfo}
        cartItems={state.items}
        orderId={walletOrderId}
      />

      {clientSecret && (
        <Elements
          stripe={getStripePromise()}
          options={{
            clientSecret,
            appearance: { theme: 'stripe' },
          }}
        >
          <Sheet
            open={isPaymentSheetOpen}
            onOpenChange={setIsPaymentSheetOpen}
          >
            <SheetContent
              side="bottom"
              className="h-[90vh] mx-auto max-w-md p-0 overflow-hidden flex flex-col"
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
                cartItems={state.items}
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
