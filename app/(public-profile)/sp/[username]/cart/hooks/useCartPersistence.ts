import { useEffect } from 'react';
import { useCart } from '../context/CartContext';

export const useCartPersistence = () => {
  const { state, dispatch } = useCart();

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

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && state.items.length > 0) {
      localStorage.setItem(
        'marketplace-add-to-cart',
        JSON.stringify(state.items)
      );
    }
  }, [state.items]);

  return null;
};
