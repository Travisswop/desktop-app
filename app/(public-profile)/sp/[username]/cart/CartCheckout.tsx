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
  LoadingSpinner,
  StripePaymentForm,
} from './components';
import {
  CustomerInfo,
  PaymentMethod,
  Status,
  CartItem,
} from './components/types';
import { createOrder } from '@/actions/orderActions';
import {
  updateCartQuantity,
  deleteCartItem,
} from '@/actions/addToCartActions';
import toast from 'react-hot-toast';
// Sonner is mounted in layout.tsx with richColors. We use it for cart
// update / removal / availability feedback because it renders inline icons
// and a description line — the legacy react-hot-toast calls remain for
// checkout-flow errors so we don't change those surfaces.
import { toast as sonner } from 'sonner';

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

const CartCheckout = () => {
  const { user, accessToken } = useUser();
  const { solanaWallets } = useSolanaWalletContext();
  const {
    state,
    dispatch,
    subtotal,
    shippingCost,
    totalCost,
    sellerId,
  } = useCart();
  const params = useParams();
  const name = params?.username as string;
  const orderIdRef = React.useRef<string | null>(null);

  // Ensure we have a parentId to use for the order even if sellerId is missing
  const [localParentId, setLocalParentId] = useState<string | null>(
    null,
  );

  // Try to get parentId from cart items if it's not available in the cart context
  useEffect(() => {
    if (!sellerId && state.items.length > 0) {
      const firstItemWithSellerId = state.items.find(
        (item) => item.sellerId,
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
  const [loading, setLoading] = React.useState(false);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] =
    React.useState(false);
  const [loadingOperations, setLoadingOperations] = React.useState<
    Record<string, { updating: boolean; deleting: boolean }>
  >({});
  const [errorMessage, setErrorMessage] = React.useState<
    string | null
  >(null);
  const activeSolanaWalletAddress = useMemo(() => {
    const privyWallet = solanaWallets?.find(
      (w: any) => w.walletClientType === 'privy' && w.address,
    );
    const solanaWallet = solanaWallets?.find(
      (w: any) =>
        (w.chainType === 'solana' || w.type === 'solana') &&
        w.address,
    );

    return privyWallet?.address || solanaWallet?.address || '';
  }, [solanaWallets]);

  // Default customer information
  const defaultCustomerInfo: CustomerInfo = {
    email: '',
    name: '',
    phone: '',
    wallet: {
      ens: '',
      address: activeSolanaWalletAddress,
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
  // Preserve original cart data for wallet payment
  const [originalCartData, setOriginalCartData] = React.useState<{
    subtotal: number;
    shippingCost: number;
    totalCost: number;
    cartItems: CartItem[];
    customerInfo: CustomerInfo;
  } | null>(null);

  // Check if any product requires physical shipping
  const hasPhygitalProducts = useMemo(() => {
    return (
      Array.isArray(state.items) &&
      state.items.some(
        (item) => item.nftTemplate?.nftType === 'phygital',
      )
    );
  }, [state.items]);

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
          address: activeSolanaWalletAddress || prev.wallet.address,
        },
        address: {
          ...prev.address,
          country: user.countryCode || prev.address.country,
          line1: user.address || prev.address.line1,
          line2: user.apt || prev.address.line2,
        },
      }));
    }
  }, [user, customerInfo.useSwopId, activeSolanaWalletAddress]);

  useEffect(() => {
    if (!activeSolanaWalletAddress) return;

    setCustomerInfo((prev) => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        address: prev.wallet.address || activeSolanaWalletAddress,
      },
    }));
  }, [activeSolanaWalletAddress]);

  // Handlers for cart operations
  const handleUpdateQuantity = useCallback(
    async (item: any, type: 'inc' | 'dec') => {
      const itemId = item._id;
      const itemName = item.nftTemplate?.name || 'Item';
      const unitPrice = Number(item.nftTemplate?.price || 0);
      try {
        setLoadingOperations((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], updating: true },
        }));

        const newQuantity =
          type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        if (newQuantity < 1) return;

        const availableQuantity = Number(
          item.nftTemplate?.mintLimit || 0,
        );
        if (
          type === 'inc' &&
          availableQuantity > 0 &&
          newQuantity > availableQuantity
        ) {
          const message = `Only ${availableQuantity} in stock`;
          setErrorMessage(
            `Only ${availableQuantity} item${
              availableQuantity === 1 ? '' : 's'
            } available.`,
          );
          sonner.warning(message, {
            description: `${itemName} has reached its available limit.`,
          });
          return;
        }

        if (accessToken && name) {
          await updateCartQuantity(
            { cartId: itemId, quantity: newQuantity },
            accessToken,
            name,
          );
        }
        dispatch({
          type: 'UPDATE_QUANTITY',
          payload: { id: itemId, quantity: newQuantity },
        });

        const direction =
          type === 'inc' ? 'added to' : 'removed from';
        sonner.success(`1 × ${itemName} ${direction} cart`, {
          duration: 2500,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update quantity';
        setErrorMessage(errorMessage);
        sonner.error("Couldn't update cart", {
          description: errorMessage,
        });
      } finally {
        setTimeout(() => {
          setLoadingOperations((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], updating: false },
          }));
        }, 300);
      }
    },
    [name, accessToken, dispatch],
  );

  const handleRemoveItem = useCallback(
    async (id: string) => {
      // Snapshot the item before the dispatch wipes it from state so the
      // toast can describe what was removed.
      const removedItem = state.items?.find((it) => it._id === id);
      const itemName = removedItem?.nftTemplate?.name || 'Item';
      const remainingAfter = Math.max(
        (state.items?.length || 1) - 1,
        0,
      );

      try {
        setLoadingOperations((prev) => ({
          ...prev,
          [id]: { ...prev[id], deleting: true },
        }));

        if (accessToken && name) {
          await deleteCartItem(
            id,
            accessToken,
            name,
            localParentId || '',
          );
        }
        dispatch({ type: 'REMOVE_ITEM', payload: id });

        sonner.success(`${itemName} removed`, { duration: 3000 });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to remove item';
        setErrorMessage(errorMessage);
        sonner.error("Couldn't remove item", {
          description: errorMessage,
        });
      } finally {
        setTimeout(() => {
          setLoadingOperations((prev) => ({
            ...prev,
            [id]: { ...prev[id], deleting: false },
          }));
        }, 300);
      }
    },
    [accessToken, name, dispatch, localParentId, state.items],
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
    [],
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
            address: activeSolanaWalletAddress || prev.wallet.address,
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
  }, [user, activeSolanaWalletAddress]);

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
        },
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
        // Ensure state.items is an array
        const cartItems = Array.isArray(state?.items)
          ? state.items
          : [];

        const buyerWalletAddress =
          activeSolanaWalletAddress ||
          customerInfo.wallet.address ||
          '';
        const buyerEns =
          customerInfo.wallet.ens || user?.ensName || '';

        if (!buyerWalletAddress && !buyerEns) {
          throw new Error(
            'A Solana wallet or SWOP ID is required for minting.',
          );
        }

        const orderInfo = {
          customerInfo: {
            ...customerInfo,
            wallet: {
              ...customerInfo.wallet,
              ens: buyerEns,
              address: buyerWalletAddress,
            },
          },
          cartItems: cartItems,
          paymentMethod,
          status: 'pending' as Status,
          sellerId: sellerId || localParentId, // Use the local parentId as fallback
        };

        const { orderId } = await createOrder(
          orderInfo,
          accessToken || '',
        );

        if (!orderId) {
          throw new Error(
            'Failed to create order. Please try again.',
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
      activeSolanaWalletAddress,
      user?.ensName,
      sellerId,
      localParentId,
    ],
  );

  // Payment handlers
  const handleOpenWalletPayment = useCallback(async () => {
    try {
      const orderId = await createOrderForPayment('wallet');
      if (orderId) {
        setWalletOrderId(orderId);
        // Preserve the original cart data before clearing
        setOriginalCartData({
          subtotal,
          shippingCost,
          totalCost,
          cartItems: [...(state.items || [])],
          customerInfo: { ...customerInfo },
        });
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
  }, [
    createOrderForPayment,
    onOpen,
    subtotal,
    shippingCost,
    totalCost,
    state.items,
    customerInfo,
  ]);

  const handleOpenPaymentSheet = useCallback(async () => {
    try {
      if (totalCost < 0.5) {
        throw new Error(
          'Card payments require a minimum total of $0.50.',
        );
      }

      const orderId = await createOrderForPayment('stripe');
      if (orderId) {
        orderIdRef.current = orderId;
        // Don't clear cart yet - only store the order ID
        // We'll clear it after successful payment in StripePaymentForm
        setLoading(true);
        const { clientSecret: secret } = await createPaymentIntent(
          Math.round(totalCost * 100),
        );

        if (!secret) {
          throw new Error('Failed to initialize payment');
        }

        setClientSecret(secret);
        setIsPaymentSheetOpen(true);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process payment';
      setErrorMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [createOrderForPayment, totalCost]);

  if (loading && !clientSecret && totalCost > 0) {
    return <LoadingSpinner />;
  }

  // Make sure state.items is defined and is an array
  const cartItems = Array.isArray(state?.items) ? state.items : [];
  const hasItems = cartItems.length > 0;

  return (
    <div className="w-full flex flex-col gap-4">
      <CartItemsList
        cartItems={cartItems}
        loadingOperations={loadingOperations}
        onUpdate={handleUpdateQuantity}
        onRemove={handleRemoveItem}
      />

      {totalCost > 0 && hasItems && (
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
          shippingCost={shippingCost}
          totalCost={totalCost}
          hasPhygitalProducts={hasPhygitalProducts}
        />
      )}

      <NftPaymentModal
        subtotal={originalCartData?.subtotal || subtotal}
        shippingCost={originalCartData?.shippingCost ?? shippingCost}
        totalCost={originalCartData?.totalCost || totalCost}
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (open) {
            onOpen();
          } else {
            onOpenChange();
            // Clear original cart data when modal is closed
            setOriginalCartData(null);
          }
        }}
        customerInfo={originalCartData?.customerInfo || customerInfo}
        cartItems={originalCartData?.cartItems || cartItems}
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
                subtotal={totalCost}
                setIsPaymentSheetOpen={setIsPaymentSheetOpen}
                setErrorMessage={setErrorMessage}
                customerInfo={customerInfo}
                cartItems={cartItems}
                accessToken={accessToken || ''}
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
