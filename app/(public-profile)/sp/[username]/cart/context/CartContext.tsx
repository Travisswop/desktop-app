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

// Helper function to get localStorage key for a specific seller's username
const getCartStorageKey = (username: string) =>
  `marketplace-cart-${username}`;

// Helper function to save cart to localStorage
const saveCartToLocalStorage = (
  items: CartItem[],
  username: string
) => {
  if (typeof window !== 'undefined' && username) {
    const storageKey = getCartStorageKey(username);
    if (items && items.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } else {
      localStorage.removeItem(storageKey);
    }
  }
};

// Helper function to load cart from localStorage
const loadCartFromLocalStorage = (
  username: string
): CartItem[] | null => {
  if (typeof window !== 'undefined' && username) {
    const storageKey = getCartStorageKey(username);
    const savedCart = localStorage.getItem(storageKey);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          return parsedCart;
        }
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }
  return null;
};

const createCartReducer =
  (username: string) =>
  (state: CartState, action: CartAction): CartState => {
    // Ensure items is always an array
    const currentItems = state.items || [];
    let newState: CartState;

    switch (action.type) {
      case 'SET_CART':
        newState = { ...state, items: action.payload, error: null };
        break;
      case 'ADD_ITEM':
        const existingItem = currentItems.find(
          (item) => item._id === action.payload._id
        );
        if (existingItem) {
          newState = {
            ...state,
            items: currentItems.map((item) =>
              item._id === action.payload._id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          };
        } else {
          newState = {
            ...state,
            items: [...currentItems, action.payload],
          };
        }
        break;
      case 'REMOVE_ITEM':
        newState = {
          ...state,
          items: currentItems.filter(
            (item) => item._id !== action.payload
          ),
        };
        break;
      case 'UPDATE_QUANTITY':
        newState = {
          ...state,
          items: currentItems.map((item) =>
            item._id === action.payload.id
              ? { ...item, quantity: action.payload.quantity }
              : item
          ),
        };
        break;
      case 'SET_LOADING':
        newState = { ...state, loading: action.payload };
        break;
      case 'SET_ERROR':
        newState = { ...state, error: action.payload };
        break;
      case 'CLEAR_CART':
        newState = { ...state, items: [] };
        break;
      default:
        return state;
    }

    // Save to localStorage after state update
    saveCartToLocalStorage(newState.items, username);
    return newState;
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
  const { user, loading: userLoading, accessToken } = useUser();
  const [sellerId, setSellerId] = useState<string | null>(null);
  const params = useParams();
  const username = params?.username as string;

  // Create reducer with current username (not sellerId)
  const cartReducer = React.useMemo(
    () => createCartReducer(username || ''),
    [username]
  );

  const [state, dispatch] = useReducer(cartReducer, initialState);
  console.log('🚀 ~ state:', state);

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

  // Load cart from localStorage on mount if user is not authenticated
  useEffect(() => {
    if (!userLoading && !user && username) {
      const savedCart = loadCartFromLocalStorage(username);
      if (savedCart) {
        dispatch({ type: 'SET_CART', payload: savedCart });

        // Extract sellerId from the first cart item for unauthenticated users
        if (savedCart.length > 0 && savedCart[0].sellerId) {
          setSellerId(savedCart[0].sellerId);
        }
      }
    }
  }, [user, userLoading, username]);

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
          // Check if data structure is as expected
          if (data.cart) {
            dispatch({
              type: 'SET_CART',
              payload: data.cart.cartItems,
            });

            // Make sure we have a valid parentId before setting
            if (data.microsite && data.microsite.parentId) {
              setSellerId(data.microsite.parentId);
            } else if (data.cart.sellerId) {
              // Alternative: check if sellerId exists directly in the cart
              setSellerId(data.cart.sellerId);
            } else if (
              data.cart.cartItems &&
              data.cart.cartItems.length > 0 &&
              data.cart.cartItems[0].sellerId
            ) {
              // Alternative: try to get sellerId from first cart item
              setSellerId(data.cart.cartItems[0].sellerId);
            } else {
              console.warn('No seller ID found in response data');
            }
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

  // Also update the sellerId when new items are added to the cart for unauthenticated users
  useEffect(() => {
    // For unauthenticated users, update sellerId when cart items change
    if (
      !user &&
      state.items.length > 0 &&
      state.items[0].sellerId &&
      !sellerId
    ) {
      setSellerId(state.items[0].sellerId);
    }
  }, [state.items, user, sellerId]);

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
