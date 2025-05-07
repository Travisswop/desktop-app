'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from 'react';
import { CartItem } from '../components/types';
import { useParams } from 'next/navigation';
import { useUser } from '@/lib/UserContext';

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type CartAction =
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | {
      type: 'UPDATE_QUANTITY';
      payload: { id: string; quantity: number };
    }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CART' };

const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
};

const cartReducer = (
  state: CartState,
  action: CartAction
): CartState => {
  // Ensure items is always an array
  const currentItems = state.items || [];

  switch (action.type) {
    case 'SET_CART':
      return { ...state, items: action.payload, error: null };
    case 'ADD_ITEM':
      const existingItem = currentItems.find(
        (item) => item._id === action.payload._id
      );
      if (existingItem) {
        return {
          ...state,
          items: currentItems.map((item) =>
            item._id === action.payload._id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { ...state, items: [...currentItems, action.payload] };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: currentItems.filter(
          (item) => item._id !== action.payload
        ),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: currentItems.map((item) =>
          item._id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    default:
      return state;
  }
};

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  subtotal: number;
  itemCount: number;
  sellerId: string | null;
  hasPhygitalProducts: boolean;
}

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

export const CartProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user, loading: userLoading, accessToken } = useUser();
  const [sellerId, setSellerId] = useState<string | null>(null);
  const params = useParams();
  const username = params?.username as string;

  const subtotal =
    state.items?.reduce(
      (total, item) =>
        total + (item.nftTemplate?.price || 0) * item.quantity,
      0
    ) || 0;

  const itemCount =
    state.items?.reduce((total, item) => total + item.quantity, 0) ||
    0;

  const hasPhygitalProducts =
    state.items?.some(
      (item) => item.nftTemplate?.nftType === 'phygital'
    ) || false;

  // Fetch cart data from backend for authenticated users
  useEffect(() => {
    const fetchCartFromBackend = async () => {
      // Don't proceed if user data is still loading
      if (userLoading) return;

      // If user is authenticated, fetch from backend
      if (user) {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          const response = await fetch(
            `${API_URL}/api/v2/desktop/user/seller/${username}`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch cart data');
          }

          const { data } = await response.json();

          if (data.cart) {
            dispatch({
              type: 'SET_CART',
              payload: data.cart.cartItems,
            });
            setSellerId(data.microsite.parentId);
          }
        } catch (error) {
          console.error('Error fetching cart:', error);
          dispatch({
            type: 'SET_ERROR',
            payload:
              'Failed to load cart data. Please try again later.',
          });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    fetchCartFromBackend();
  }, [user, username, userLoading, accessToken]);

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        subtotal,
        itemCount,
        sellerId,
        hasPhygitalProducts,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
