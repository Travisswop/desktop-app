'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@/lib/UserContext';
import { useParams, useRouter } from 'next/navigation';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import { useCart } from './context/CartContext';
import { useCartPersistence } from './hooks/useCartPersistence';
import { CartItemsList, CheckoutCard } from './components';
import { CartItem, CustomerInfo } from './components/types';
import { createMarketplaceCheckoutIntent } from '@/lib/checkout-api';
import {
  checkoutUrlWithPaymentMethod,
  getPhantomCheckoutUrl,
} from '@/lib/phantom-checkout';
import toast from 'react-hot-toast';
// Sonner is mounted in layout.tsx with richColors. We use it for cart
// update / removal / availability feedback because it renders inline icons
// and a description line — the legacy react-hot-toast calls remain for
// checkout-flow errors so we don't change those surfaces.
import { toast as sonner } from 'sonner';

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
  const { state, dispatch, subtotal, shippingCost, totalCost } = useCart();
  const params = useParams();
  const router = useRouter();
  const name = params?.username as string;

  // Initialize cart persistence
  useCartPersistence();

  const cartItems = useMemo(
    () => (Array.isArray(state?.items) ? state.items : []),
    [state?.items]
  );

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

  // Check if any product requires physical shipping
  const hasPhygitalProducts = useMemo(() => {
    return cartItems.some(
      (item) =>
        item.productType === 'physical' ||
        item.nftTemplate?.nftType === 'phygital'
    );
  }, [cartItems]);

  // Update customer info when user changes
  React.useEffect(() => {
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
    async (item: CartItem, type: 'inc' | 'dec') => {
      const itemId = item._id;
      const itemName = item.nftTemplate?.name || 'Item';
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
    [dispatch],
  );

  const handleRemoveItem = useCallback(
    async (id: string) => {
      // Snapshot the item before the dispatch wipes it from state so the
      // toast can describe what was removed.
      const removedItem = state.items?.find((it) => it._id === id);
      const itemName = removedItem?.nftTemplate?.name || 'Item';

      try {
        setLoadingOperations((prev) => ({
          ...prev,
          [id]: { ...prev[id], deleting: true },
        }));

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
    [dispatch, state.items],
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
      // Deselecting: clear the fields that were auto-filled from the Swop.ID
      return {
        ...prev,
        useSwopId: newUseSwopId,
        name: '',
        phone: '',
        email: '',
        wallet: {
          ens: '',
          address: activeSolanaWalletAddress,
        },
        address: {
          ...prev.address,
          country: 'US',
          line1: '',
          line2: '',
        },
      };
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

  const createCartCheckoutIntent = useCallback(async () => {
    if (!accessToken) {
      const message = 'Please sign in to pay with wallet';
      setErrorMessage(message);
      toast.error(message);
      return null;
    }

    if (!validateFormFields()) return null;

    const checkoutLineItems = cartItems.map((item) => ({
      productId:
        item.marketplaceProductId || item.nftTemplate?._id || item._id || '',
      quantity: item.quantity,
    }));
    const hasInvalidItem = checkoutLineItems.some(
      (item) => !item.productId || item.quantity < 1
    );

    if (checkoutLineItems.length === 0 || hasInvalidItem) {
      const message = 'One or more cart items are no longer available.';
      setErrorMessage(message);
      toast.error(message);
      return null;
    }

    try {
      return await createMarketplaceCheckoutIntent(
        {
          merchantCurrency: 'USDC',
          checkoutMode: 'online',
          checkoutBaseUrl:
            typeof window !== 'undefined' ? window.location.origin : undefined,
          description:
            cartItems.length === 1
              ? cartItems[0].nftTemplate.name
              : `${cartItems.length} SmartSite items`,
          lineItems: checkoutLineItems,
          customerInfo: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: customerInfo.address,
          },
        },
        accessToken
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create checkout. Please try again.';
      setErrorMessage(message);
      toast.error(message);
      return null;
    }
  }, [
    accessToken,
    validateFormFields,
    cartItems,
    customerInfo,
  ]);

  const completeCartCheckout = useCallback(
    (message = 'Checkout ready') => {
      dispatch({ type: 'CLEAR_CART' });
      clearCartFromLocalStorage(name);
      toast.success(message);
    },
    [dispatch, name]
  );

  const handleOpenWalletPayment = useCallback(async () => {
    const intent = await createCartCheckoutIntent();
    if (!intent) return;

    completeCartCheckout('Payment request sent');
    router.push(
      checkoutUrlWithPaymentMethod({
        checkoutUrl: intent.checkoutUrl,
        intentId: intent.intentId,
        method: 'swop',
      }) || `/checkout/${encodeURIComponent(intent.intentId)}?method=swop`
    );
  }, [completeCartCheckout, createCartCheckoutIntent, router]);

  const handleOpenPhantomPayment = useCallback(async () => {
    const intent = await createCartCheckoutIntent();
    if (!intent) return;

    completeCartCheckout('Opening Phantom checkout');

    const fallbackUrl = checkoutUrlWithPaymentMethod({
      checkoutUrl: intent.checkoutUrl,
      intentId: intent.intentId,
      method: 'phantom',
    });
    const phantomUrl = getPhantomCheckoutUrl({
      checkoutUrl: fallbackUrl,
      intentId: intent.intentId,
    });

    window.location.href =
      phantomUrl || fallbackUrl || `/checkout/${intent.intentId}`;
  }, [completeCartCheckout, createCartCheckoutIntent]);

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
          handleOpenWalletPayment={handleOpenWalletPayment}
          handleOpenPhantomPayment={handleOpenPhantomPayment}
          errorMessage={errorMessage}
          cartItems={cartItems}
          subtotal={subtotal}
          shippingCost={shippingCost}
          totalCost={totalCost}
          hasPhygitalProducts={hasPhygitalProducts}
        />
      )}
    </div>
  );
};

export default CartCheckout;
