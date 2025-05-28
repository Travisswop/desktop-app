import {
  shouldShowRefundedTag,
  isOrderRefunded,
  hasResolvedDisputeWithRefund,
} from './refundUtils';
import { OrderData } from '../types/order.types';

// Mock order data
const mockOrder: OrderData = {
  _id: 'order_123',
  orderId: 'ORD-123',
  buyer: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },
  seller: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+0987654321',
  },
  collectionId: 'collection_1',
  totalPriceOfNFTs: 100,
  orderDate: '2024-01-01T00:00:00Z',
  status: {
    delivery: 'Completed',
    payment: 'completed',
  },
  edited: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  orderType: 'phygitals',
  processingStages: [],
  mintedNfts: [],
  financial: {
    subtotal: 90,
    discountRate: 0,
    shippingCost: 10,
    totalCost: 100,
  },
};

// Mock disputes
const mockDisputes = [
  {
    id: 'dispute_1',
    status: 'resolved' as const,
    response:
      'We have processed a full refund of $100 to your original payment method.',
  },
  {
    id: 'dispute_2',
    status: 'resolved' as const,
    response:
      'Issue resolved without refund. Product replacement sent.',
  },
  {
    id: 'dispute_3',
    status: 'pending' as const,
    response: undefined,
  },
];

// Test cases
console.log('Testing refund detection logic...\n');

// Test 1: Order with refunded payment status
const refundedOrder = {
  ...mockOrder,
  status: { ...mockOrder.status, payment: 'refunded' as const },
};
console.log('Test 1 - Order with refunded payment status:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(refundedOrder, [])
);
console.log('Is order refunded:', isOrderRefunded(refundedOrder));
console.log('');

// Test 2: Order with resolved dispute containing refund
console.log(
  'Test 2 - Order with resolved dispute containing refund:'
);
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(mockOrder, [mockDisputes[0]])
);
console.log(
  'Has resolved dispute with refund:',
  hasResolvedDisputeWithRefund([mockDisputes[0]])
);
console.log('');

// Test 3: Order with resolved dispute without refund
console.log('Test 3 - Order with resolved dispute without refund:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(mockOrder, [mockDisputes[1]])
);
console.log(
  'Has resolved dispute with refund:',
  hasResolvedDisputeWithRefund([mockDisputes[1]])
);
console.log('');

// Test 4: Order with pending dispute
console.log('Test 4 - Order with pending dispute:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(mockOrder, [mockDisputes[2]])
);
console.log(
  'Has resolved dispute with refund:',
  hasResolvedDisputeWithRefund([mockDisputes[2]])
);
console.log('');

// Test 5: Order with no disputes and completed payment
console.log('Test 5 - Order with no disputes and completed payment:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(mockOrder, [])
);
console.log('Is order refunded:', isOrderRefunded(mockOrder));
console.log('');

console.log('All tests completed!');
