import { useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';

export const useCartPersistence = () => {
  const { state, dispatch } = useCart();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(
        'marketplace-add-to-cart'
      );
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          dispatch({ type: 'SET_CART', payload: parsedCart });
        } catch (error) {
          console.error(
            'Error parsing cart from localStorage:',
            error
          );
        }
      }
    }
  }, [dispatch]);

  // Save cart to localStorage when it changes with debouncing
  useEffect(() => {
    if (typeof window !== 'undefined' && state.items.length > 0) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 500ms of no changes
      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(
          'marketplace-add-to-cart',
          JSON.stringify(state.items)
        );
      }, 500);
    }

    // Cleanup function to clear timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.items]);

  return null;
};
