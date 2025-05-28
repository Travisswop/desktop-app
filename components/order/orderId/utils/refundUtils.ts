import { OrderData } from '../types/order.types';

export interface DisputeItem {
  id: string;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  response?: string;
}

/**
 * Checks if an order has been refunded based on payment status
 */
export const isOrderRefunded = (order: OrderData): boolean => {
  return order.status.payment === 'refunded';
};

/**
 * Checks if there's a resolved dispute with refund mentioned in the response
 */
export const hasResolvedDisputeWithRefund = (
  disputes: DisputeItem[]
): boolean => {
  return disputes.some((dispute) => {
    if (dispute.status !== 'resolved' || !dispute.response) {
      return false;
    }

    const response = dispute.response.toLowerCase();

    // Check for positive refund indicators
    const hasRefundKeywords =
      response.includes('processed a refund') ||
      response.includes('refund has been') ||
      response.includes('refund of $') ||
      response.includes('refund will be') ||
      response.includes('full refund') ||
      response.includes('partial refund') ||
      response.includes('refunded to') ||
      response.includes('refund processed');

    // Check for negative refund indicators
    const hasNoRefundKeywords =
      response.includes('without refund') ||
      response.includes('no refund') ||
      response.includes('refund denied') ||
      response.includes('refund rejected');

    return hasRefundKeywords && !hasNoRefundKeywords;
  });
};

/**
 * Determines if the order should show a refunded tag
 */
export const shouldShowRefundedTag = (
  order: OrderData,
  disputes: DisputeItem[] = []
): boolean => {
  // Check if payment status is explicitly refunded
  if (isOrderRefunded(order)) {
    return true;
  }

  // Check if there's a resolved dispute with refund mentioned
  if (hasResolvedDisputeWithRefund(disputes)) {
    return true;
  }

  return false;
};
