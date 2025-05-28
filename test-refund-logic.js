// Simple test for refund detection logic

// Mock the utility functions
const isOrderRefunded = (order) => {
  return order.status.payment === 'refunded';
};

const hasResolvedDisputeWithRefund = (disputes) => {
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

const shouldShowRefundedTag = (order, disputes = []) => {
  if (isOrderRefunded(order)) {
    return true;
  }

  if (hasResolvedDisputeWithRefund(disputes)) {
    return true;
  }

  return false;
};

// Test cases
console.log('Testing refund detection logic...\n');

// Test 1: Order with refunded payment status
const refundedOrder = { status: { payment: 'refunded' } };
console.log('Test 1 - Order with refunded payment status:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(refundedOrder, [])
);
console.log('Is order refunded:', isOrderRefunded(refundedOrder));
console.log('');

// Test 2: Order with resolved dispute containing refund
const normalOrder = { status: { payment: 'completed' } };
const refundDispute = {
  status: 'resolved',
  response:
    'We have processed a full refund of $100 to your original payment method.',
};
console.log(
  'Test 2 - Order with resolved dispute containing refund:'
);
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(normalOrder, [refundDispute])
);
console.log(
  'Has resolved dispute with refund:',
  hasResolvedDisputeWithRefund([refundDispute])
);
console.log('');

// Test 3: Order with resolved dispute without refund
const noRefundDispute = {
  status: 'resolved',
  response:
    'Issue resolved without refund. Product replacement sent.',
};
console.log('Test 3 - Order with resolved dispute without refund:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(normalOrder, [noRefundDispute])
);
console.log(
  'Has resolved dispute with refund:',
  hasResolvedDisputeWithRefund([noRefundDispute])
);
console.log('');

// Test 4: Order with pending dispute
const pendingDispute = {
  status: 'pending',
  response: undefined,
};
console.log('Test 4 - Order with pending dispute:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(normalOrder, [pendingDispute])
);
console.log(
  'Has resolved dispute with refund:',
  hasResolvedDisputeWithRefund([pendingDispute])
);
console.log('');

// Test 5: Order with no disputes and completed payment
console.log('Test 5 - Order with no disputes and completed payment:');
console.log(
  'Should show refunded tag:',
  shouldShowRefundedTag(normalOrder, [])
);
console.log('Is order refunded:', isOrderRefunded(normalOrder));
console.log('');

console.log('All tests completed!');
