// Order-related type definitions
export interface NFT {
  _id: string;
  userId: string;
  collectionId: string;
  collectionMintAddress: string;
  ownerAddress: string;
  name: string;
  description: string;
  image: string;
  price: number;
  nftType: string;
  benefits?: string[];
  requirements?: string[];
  content?: string[];
  addons?: string[];
  quantity: number;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  wallet?: {
    ens?: string;
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface ProcessingStage {
  _id: string;
  stage: string;
  status: string;
  timestamp: string;
}

export interface OrderData {
  _id: string;
  orderId: string;
  buyer: Customer;
  seller: Customer;
  collectionId: string;
  totalPriceOfNFTs: number;
  orderDate: string;
  status: {
    delivery:
      | 'Not Initiated'
      | 'In Progress'
      | 'Completed'
      | 'Cancelled';
    payment:
      | 'pending'
      | 'processing'
      | 'completed'
      | 'failed'
      | 'refunded'
      | 'cancelled';
  };
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  orderType: string;
  processingStages: ProcessingStage[];
  mintedNfts: any[];
  financial: {
    subtotal: number;
    discountRate: number;
    shippingCost: number;
    totalCost: number;
  };
  billing?: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  shipping?: {
    trackingNumber?: string;
    provider?: string;
    estimatedDeliveryDate?: string;
    notes?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  // Payment information
  paymentMethod?: 'stripe' | 'wallet';
  stripePayment?: {
    paymentIntentId?: string;
    paymentMethod?: {
      payment_type?: string;
      brand?: string;
      last4?: string;
    };
  };
  walletPayment?: {
    transactionHash?: string;
    walletAddress?: string;
    tokenSymbol?: string;
    tokenAmount?: string;
  };
}

export interface ShippingUpdateData {
  deliveryStatus:
    | 'Not Initiated'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled';
  trackingNumber: string;
  shippingProvider: string;
  estimatedDeliveryDate: string;
  additionalNotes: string;
}

export type UserRole = 'buyer' | 'seller';
export type StageKey =
  | 'order_created'
  | 'payment_completed'
  | 'nft_minted'
  | 'items_picked'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'order_completed'
  | 'order_failed'
  | 'cancelled'
  | 'refunded'
  | 'dispute_raised'
  | 'dispute_resolved'
  | 'dispute_closed';
export type StatusKey =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';
