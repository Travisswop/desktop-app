import { useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useParams } from 'next/navigation';

// Helper function to get localStorage key for a specific seller's username
const getCartStorageKey = (username: string) =>
  `marketplace-cart-${username}`;

export const useCartPersistence = () => {
  const { state, dispatch } = useCart();
  const params = useParams();
  const username = params?.username as string;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && username) {
      const storageKey = getCartStorageKey(username);
      const savedCart = localStorage.getItem(storageKey);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            dispatch({ type: 'SET_CART', payload: parsedCart });
          }
        } catch (error) {
          console.error(
            'Error parsing cart from localStorage:',
            error
          );
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [dispatch, username]);

  // Save cart to localStorage when it changes with debouncing
  useEffect(() => {
    if (typeof window !== 'undefined' && username) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 500ms of no changes
      saveTimeoutRef.current = setTimeout(() => {
        const storageKey = getCartStorageKey(username);
        if (state.items.length > 0) {
          localStorage.setItem(
            storageKey,
            JSON.stringify(state.items)
          );
        } else {
          localStorage.removeItem(storageKey);
        }
      }, 500);
    }

    // Cleanup function to clear timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.items, username]);

  return null;
};
