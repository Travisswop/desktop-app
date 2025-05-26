import { StageKey, StatusKey } from '../types/order.types';

// Stage display names mapping
export const stageDisplayNames: Record<StageKey, string> = {
  order_created: 'Order Created',
  payment_verified: 'Payment Verified',
  nft_minted: 'NFT Minted',
  shipping_prepared: 'Shipping',
  completed: 'Order Completed',
  stripe_payment: 'Stripe Payment',
  guest_receipt: 'Guest Receipt',
};

// Status display names mapping
export const statusDisplayNames: Record<StatusKey, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending',
  failed: 'Failed',
};

// Delivery status options for shipping updates
export const deliveryStatusOptions = [
  { key: 'Not Initiated', label: 'Not Initiated' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
];

// Order table headers
export const orderTableHeaders = [
  'Product',
  'Price',
  'Quantity',
  'Total',
];
