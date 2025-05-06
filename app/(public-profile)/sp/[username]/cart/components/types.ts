import { useUser } from '@/lib/UserContext';

export type PaymentMethod = 'stripe' | 'wallet';
export type Status =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface Wallet {
  ens: string;
  address: string;
}

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type NftType = 'phygital' | 'non-phygital';

export interface CustomerInfo {
  email: string;
  name: string;
  phone: string;
  wallet: Wallet;
  useSwopId: boolean;
  address: Address;
}

export interface CartItem {
  _id: string;
  quantity: number;
  collectionId?: string;
  templateId?: string;
  userId?: string;
  sellerId?: string;
  nftTemplate: {
    _id?: string;
    name: string;
    description: string;
    image: string;
    price: number;
    nftType: NftType;
    collectionId?: string;
    collectionMintAddress?: string;
    ownerAddress?: string;
    mintLimit?: number;
    royaltyPercentage?: number;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
    addons?: string[];
    benefits?: any[];
    content?: any[];
    requirements?: any[];
  };
}

export interface LoadingOperations {
  [key: string]: {
    updating: boolean;
    deleting: boolean;
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
