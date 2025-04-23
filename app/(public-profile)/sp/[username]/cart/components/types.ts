import { useUser } from '@/lib/UserContext';

export type PaymentMethod = 'stripe' | 'wallet';
export type Status =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
export interface CustomerInfo {
  email: string;
  name: string;
  phone: string;
  useSwopId: boolean;
  wallet: {
    ens: string;
    address: string;
  };
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface CartItem {
  _id: string;
  quantity: number;
  nftTemplate: {
    name: string;
    price: number;
    image: string;
    ownerAddress: string;
    nftType?: string;
  };
}

export interface CartItemsListProps {
  cartItems: CartItem[];
  loadingOperations: Record<
    string,
    { updating: boolean; deleting: boolean }
  >;
  onUpdate: (item: CartItem, type: 'inc' | 'dec') => void;
  onRemove: (id: string) => void;
}

export interface CheckoutCardProps {
  user: ReturnType<typeof useUser>['user'] | null;
  customerInfo: CustomerInfo;
  toggleUseSwopId: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCountryChange: (value: string) => void;
  handleOpenPaymentSheet: () => void;
  handleOpenWalletPayment: () => void;
  errorMessage: string | null;
  cartItems: CartItem[];
  subtotal: number;
  hasPhygitalProducts: boolean;
}

export interface ErrorDisplayProps {
  error: string;
}

export interface StripePaymentFormProps {
  email: string;
  subtotal: number;
  setIsPaymentSheetOpen: (isOpen: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  customerInfo: CustomerInfo;
  cartItems: CartItem[];
  accessToken: string;
  orderId?: string | null;
  clientSecret: any;
}

export interface CartData {
  state: string;
  data: {
    cartItems: CartItem[];
  };
}

export interface CartCheckoutProps {
  data: CartData;
  accessToken: string;
}
