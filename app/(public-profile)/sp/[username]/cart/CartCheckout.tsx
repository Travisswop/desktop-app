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
  getNftDetails,
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
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';

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

// Helper function to handle localStorage cart
const getCartFromLocalStorage = () => {
  if (typeof window !== 'undefined') {
    const cart = localStorage.getItem('marketplace-add-to-cart');
    return cart ? JSON.parse(cart) : [];
  }
  return [];
};

const CartCheckout = ({ data, accessToken }: any) => {
  const { user } = useUser();
  const { solanaWallets } = useSolanaWalletContext();
  const [localCartData, setLocalCartData] = useState([]);
  const [nftDetails, setNftDetials] = useState<any>();
  const [cartItems, setCartItems] = useState<any>([]);

  useEffect(() => {
    if (!accessToken) {
      const cartData = getCartFromLocalStorage();
      setLocalCartData(cartData);
    }
  }, [accessToken]);

  useEffect(() => {
    const fetchNftData = async () => {
      const data = await getNftDetails(localCartData);
      setNftDetials(data);
    };
    if (!accessToken && localCartData?.length > 0) {
      fetchNftData();
    }
  }, [accessToken, localCartData, localCartData?.length]);

  console.log('localCartData', localCartData);

  const solanaWallet = solanaWallets?.find(
    (w: any) => w.walletClientType === 'privy'
  );

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

  // Default customer information
  const defaultCustomerInfo: CustomerInfo = {
    email: '',
    name: '',
    phone: '',
    wallet: {
      ens: '',
      address: solanaWallet?.address || '',
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
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(
    defaultCustomerInfo
  );

  // NFT wallet payment modal state
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [walletOrderId, setWalletOrderId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (accessToken) {
      if (
        data?.state !== 'success' ||
        !Array.isArray(data?.data?.cartItems)
      ) {
        setCartItems([]);
      } else {
        setCartItems(data.data.cartItems);
      }
    } else {
      if (!accessToken && nftDetails?.data?.cartItems) {
        setCartItems(nftDetails?.data?.cartItems);
      } else {
        setCartItems([]);
      }
    }
  }, [
    accessToken,
    data?.data?.cartItems,
    data?.state,
    nftDetails?.data?.cartItems,
  ]);

  // Parse cart items with proper error handling
  // const cartItems: CartItem[] = useMemo(() => {
  //   if (accessToken) {
  //     if (data?.state !== "success" || !Array.isArray(data?.data?.cartItems)) {
  //       return [];
  //     }
  //     return data.data.cartItems;
  //   } else {
  //     return nftDetails?.data?.cartItems;
  //   }
  // }, [
  //   accessToken,
  //   data?.data?.cartItems,
  //   data?.state,
  //   nftDetails?.data?.cartItems,
  // ]);

  console.log('cartItems', cartItems);

  // Check if any product requires physical shipping
  const hasPhygitalProducts = useMemo(() => {
    return cartItems.some(
      (item: any) => item.nftTemplate.nftType === 'phygital'
    );
  }, [cartItems]);

  // Calculate total price
  const subtotal = useMemo(() => {
    if (!cartItems.length) return 0;

    return cartItems.reduce((total: any, item: any) => {
      const price = item?.nftTemplate?.price || 0;
      const quantity = item?.quantity || 0;
      return total + price * quantity;
    }, 0);
  }, [cartItems]);

  // Initialize payment
  useEffect(() => {
    const initializePayment = async () => {
      if (subtotal <= 0 || clientSecret) return;

      try {
        setLoading(true);
        setError(null);
        const { clientSecret: secret } = await createPaymentIntent(
          Math.round(subtotal * 100) // Convert to smallest currency unit (cents)
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
          address: solanaWallet?.address || prev.wallet.address,
        },
        address: {
          ...prev.address,
          country: user.countryCode || prev.address.country,
          line1: user.address || prev.address.line1,
          line2: user.apt || prev.address.line2,
        },
      }));
    }
  }, [user, customerInfo.useSwopId, solanaWallet]);

  // Handlers for cart operations - memoized to prevent re-creation on renders
  const handleUpdateQuantity = useCallback(
    async (item: CartItem, type: 'inc' | 'dec') => {
      const itemId = item._id;

      try {
        // Update loading state
        setLoadingOperations((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], updating: true },
        }));

        const newQuantity =
          type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        if (newQuantity < 1) return;

        const payload = {
          cartId: itemId,
          quantity: newQuantity,
        };

        if (name) {
          await updateCartQuantity(payload, accessToken, name);
        }
      } catch (error) {
        console.error('Error updating quantity:', error);
        setErrorMessage('Failed to update quantity');
      } finally {
        // Reset loading state with slight delay for UI feedback
        setTimeout(() => {
          setLoadingOperations((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], updating: false },
          }));
        }, 300);
      }
    },
    [name, accessToken]
  );

  // Cart item removal handler
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
        }, 300);
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

      setCustomerInfo((prev) => {
        // Handle nested properties (address.line1, etc.)
        if (name.includes('.')) {
          const [parent, child] = name.split('.');
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
        }

        // Handle top-level properties
        return {
          ...prev,
          [name]: value,
        };
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

  const createOrderForPayment = useCallback(
    async (paymentMethod: PaymentMethod) => {
      if (!validateFormFields()) {
        return null;
      }

      try {
        setErrorMessage(null);

        const orderInfo = {
          customerInfo: {
            ...customerInfo,
            wallet: {
              ...customerInfo.wallet,
              address: solanaWallet?.address,
            },
          },
          cartItems,
          paymentMethod,
          status: 'pending' as Status,
        };

        console.log('orderInfo', orderInfo);

        const { orderId } = await createOrder(orderInfo, accessToken);
        console.log('🚀 ~ orderId:', orderId);
        return orderId;
      } catch (error) {
        console.error('Error creating order:', error);
        setErrorMessage('Failed to create order. Please try again.');
        return null;
      }
    },
    [
      validateFormFields,
      customerInfo,
      cartItems,
      subtotal,
      accessToken,
      setErrorMessage,
    ]
  );

  // Handle wallet payment
  const handleOpenWalletPayment = useCallback(async () => {
    const orderId = await createOrderForPayment('wallet');
    if (orderId) {
      setWalletOrderId(orderId);
      onOpen();
    }
  }, [createOrderForPayment, onOpen]);

  // Handle Stripe payment
  const handleOpenPaymentSheet = useCallback(async () => {
    const orderId = await createOrderForPayment('stripe');
    if (orderId) {
      orderIdRef.current = orderId;

      // Initialize payment intent
      if (!clientSecret) {
        try {
          setLoading(true);
          const { clientSecret: secret } = await createPaymentIntent(
            Math.round(subtotal * 1000)
          );
          setClientSecret(secret);
        } catch (paymentError) {
          console.error('Error initializing payment:', paymentError);
          setErrorMessage(
            'Could not initialize payment. Please try again.'
          );
          return;
        } finally {
          setLoading(false);
        }
      }

      setIsPaymentSheetOpen(true);
    }
  }, [
    createOrderForPayment,
    clientSecret,
    subtotal,
    setErrorMessage,
    setLoading,
  ]);

  // Main conditional rendering
  if (loading && !clientSecret && subtotal > 0) {
    return <LoadingSpinner />;
  }

  console.log('customerInfo', customerInfo);
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
          handleOpenWalletPayment={handleOpenWalletPayment}
          errorMessage={errorMessage}
          cartItems={cartItems}
          subtotal={subtotal}
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
        customerInfo={customerInfo}
        cartItems={cartItems}
        orderId={walletOrderId}
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
