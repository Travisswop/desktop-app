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
import { useMicrositeData } from '../../context/MicrositeContext';

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

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

const isMarketplaceCartItem = (item: CartItem) =>
  Boolean(item?.marketplaceProductId);

// Helper function to save cart to localStorage
const saveCartToLocalStorage = (
  items: CartItem[],
  username: string
) => {
  if (typeof window !== 'undefined' && username) {
    const storageKey = getCartStorageKey(username);
    const marketplaceItems = (items || []).filter(isMarketplaceCartItem);
    if (marketplaceItems.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(marketplaceItems));
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
          const marketplaceItems = parsedCart.filter(isMarketplaceCartItem);
          if (marketplaceItems.length > 0) {
            return marketplaceItems;
          }
          localStorage.removeItem(storageKey);
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
  shippingCost: number;
  totalCost: number;
  itemCount: number;
  sellerId: string | null;
  hasPhygitalProducts: boolean;
  micrositeData: any; // We'll get the type from MicrositeContext
}

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

export const CartProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { micrositeData } = useMicrositeData();
  const [sellerId, setSellerId] = useState<string | null>(null);
  const params = useParams();
  const username = params?.username as string;

  // Create reducer with current username (not sellerId)
  const cartReducer = React.useMemo(
    () => createCartReducer(username || ''),
    [username]
  );

  const [state, dispatch] = useReducer(cartReducer, initialState);

  const subtotal =
    state.items?.reduce(
      (total, item) =>
        total + Number(item.nftTemplate?.price || 0) * item.quantity,
      0
    ) || 0;

  // Shipping is a single flat fee per order (the cart is scoped to one
  // seller via the URL). We pick the highest configured shippingCost among
  // items that require shipping — multiplying by quantity or summing across
  // line items would over-charge a buyer who orders multiple things in one
  // shipment from the same seller.
  const shippingCost =
    state.items?.reduce((max, item) => {
      const cost = Number(item.nftTemplate?.shippingCost || 0);
      if (!item.nftTemplate?.shippingRequired || cost <= 0) return max;
      return cost > max ? cost : max;
    }, 0) || 0;

  const totalCost = subtotal + shippingCost;

  const itemCount =
    state.items?.reduce((total, item) => total + item.quantity, 0) ||
    0;

  const hasPhygitalProducts =
    state.items?.some(
      (item) => item.nftTemplate?.nftType === 'phygital'
        || item.productType === 'physical'
    ) || false;

  // Load the SmartSite marketplace cart from localStorage for every buyer state.
  useEffect(() => {
    if (!username) return;

    const savedCart = loadCartFromLocalStorage(username);
    if (savedCart) {
      dispatch({ type: 'SET_CART', payload: savedCart });

      if (savedCart.length > 0 && savedCart[0].sellerId) {
        setSellerId(savedCart[0].sellerId);
      }
    }
  }, [username]);

  useEffect(() => {
    if (micrositeData?._id) {
      setSellerId(micrositeData._id);
    }
  }, [micrositeData?._id]);

  // Also update the sellerId when new items are added to the cart.
  useEffect(() => {
    if (
      state.items.length > 0 &&
      state.items[0].sellerId &&
      !sellerId
    ) {
      setSellerId(state.items[0].sellerId);
    }
  }, [state.items, sellerId]);

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        subtotal,
        shippingCost,
        totalCost,
        itemCount,
        sellerId,
        hasPhygitalProducts,
        micrositeData,
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
