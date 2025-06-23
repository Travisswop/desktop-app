import { StageKey, StatusKey } from '../types/order.types';

// Stage display names mapping
export const stageDisplayNames: Record<StageKey, string> = {
  order_created: 'Order Created',
  payment_completed: 'Payment Completed',
  nft_minted: 'NFT Minted',
  nft_minting_started: 'NFT Minting Started',
  token_swapped: 'Token Swapped',
  funds_processing: 'Funds Processing',
  fulfillment_started: 'Fulfillment Started',
  items_picked: 'Items Picked',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  order_completed: 'Order Completed',
  order_failed: 'Order Failed',
  funds_released: 'Funds Released',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  dispute_raised: 'Dispute Raised',
  dispute_resolved: 'Dispute Resolved',
  dispute_closed: 'Dispute Closed',
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
