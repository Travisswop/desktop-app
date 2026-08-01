/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import OrderDetailScreen, {
  type OrderDetail,
} from '@/components/order/OrderDetailScreen';
import OrdersScreen from '@/components/order/OrdersScreen';
import {
  marketplaceOrderContextFromTab,
  marketplacePaymentFlowStatus,
  resolveMarketplaceOrderDetailContext,
  type MarketplaceOrder,
} from '@/lib/marketplace-api';

const mockRouterPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const baseOrder: OrderDetail = {
  _id: 'order-db-id',
  orderId: 'SWOP-SELF-1',
  orderDate: '2026-07-31T12:00:00.000Z',
  delivery: 'Pending',
  payment: 'completed',
  chain: 'Solana',
  financial: {
    subtotal: 25,
    shippingCost: 5,
    totalCost: 30,
    currency: 'USDC',
  },
  counterparty: {
    id: 'same-user',
    name: 'Self Seller',
    avatar: 'SS',
  },
  lines: [
    {
      productId: 'product-1',
      name: 'Shippable item',
      image: null,
      price: 25,
      quantity: 1,
    },
  ],
  userRole: 'buyer',
  viewerIsBuyer: true,
  viewerIsSeller: true,
  fulfillment: {
    requiresShipping: true,
    status: 'delivered',
    deliveredAt: '2026-07-31T13:00:00.000Z',
    releaseConditions: { shippingConfirmed: true },
  },
  settlement: {
    policy: 'escrow_on_receipt',
    status: 'held',
  },
};

describe('self-purchase order actions', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it('shows shipping controls in the Sold context', () => {
    render(
      <OrderDetailScreen
        order={{ ...baseOrder, userRole: 'seller' }}
        onUpdateShipping={jest.fn().mockResolvedValue(undefined)}
        onConfirmReceipt={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Update Shipping' })
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Confirm order received' })
    ).not.toBeInTheDocument();
  });

  it('opens the shipping form from the Sold detail page', () => {
    render(
      <OrderDetailScreen
        order={{ ...baseOrder, userRole: 'seller' }}
        onUpdateShipping={jest.fn().mockResolvedValue(undefined)}
        onConfirmReceipt={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update Shipping' }));

    expect(screen.getByPlaceholderText('Tracking number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('UPS, USPS, FedEx...')).toBeInTheDocument();
  });

  it('shows receipt confirmation in Purchases without seller controls', () => {
    render(
      <OrderDetailScreen
        order={baseOrder}
        onUpdateShipping={jest.fn().mockResolvedValue(undefined)}
        onConfirmReceipt={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Confirm order received' })
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Update Shipping' })
    ).not.toBeInTheDocument();
  });

  it('allows buyer confirmation once the seller marks the order shipped', () => {
    render(
      <OrderDetailScreen
        order={{
          ...baseOrder,
          fulfillment: {
            requiresShipping: true,
            status: 'shipped',
            shippedAt: '2026-07-31T12:30:00.000Z',
            releaseConditions: { shippingConfirmed: false },
          },
        }}
        onConfirmReceipt={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Confirm order received' })
    ).toBeEnabled();
    expect(
      screen.getByText(
        'In transit. Confirm receipt after it arrives to release funds.'
      )
    ).toBeInTheDocument();
  });

  it('does not expose shipping controls to a buyer who is not the seller', () => {
    render(
      <OrderDetailScreen
        order={{ ...baseOrder, viewerIsSeller: false }}
        onUpdateShipping={jest.fn().mockResolvedValue(undefined)}
        onConfirmReceipt={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Update Shipping' })
    ).not.toBeInTheDocument();
  });

  it('resolves a self-order from the selected Sold or Purchases tab', () => {
    const selfOrder = {
      buyer: { id: 'same-user' },
      merchant: { id: 'same-user' },
    } as MarketplaceOrder;

    expect(marketplaceOrderContextFromTab('sold')).toBe('seller');
    expect(marketplaceOrderContextFromTab('purchases')).toBe('buyer');
    expect(
      resolveMarketplaceOrderDetailContext(selfOrder, 'same-user', 'seller')
        .context
    ).toBe('seller');
    expect(
      resolveMarketplaceOrderDetailContext(selfOrder, 'same-user', 'buyer')
        .context
    ).toBe('buyer');
  });

  it('ignores a requested role the signed-in user does not have', () => {
    const buyerOnlyOrder = {
      buyer: { id: 'buyer-user' },
      merchant: { id: 'seller-user' },
    } as MarketplaceOrder;

    const resolved = resolveMarketplaceOrderDetailContext(
      buyerOnlyOrder,
      'buyer-user',
      'seller'
    );

    expect(resolved.context).toBe('buyer');
    expect(resolved.viewerIsSeller).toBe(false);
  });

  it('keeps Payments read-only and reports the escrow flow', () => {
    const selfOrder = {
      ...baseOrder,
      userRole: 'payment' as const,
    };
    render(
      <OrderDetailScreen
        order={selfOrder}
        onUpdateShipping={jest.fn().mockResolvedValue(undefined)}
        onConfirmReceipt={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(marketplaceOrderContextFromTab('payments')).toBe('payment');
    expect(
      marketplacePaymentFlowStatus({
        payment: { status: 'completed' },
        settlement: { policy: 'escrow_on_receipt', status: 'held' },
      } as MarketplaceOrder)
    ).toBe('In escrow');
    expect(screen.getByText('Payment Flow & Escrow')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Update Shipping' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Confirm order received' })
    ).not.toBeInTheDocument();
  });

  it('labels the payment sources and escrow states in the Payments table', () => {
    render(
      <OrdersScreen
        tab="Payments"
        onTabChange={jest.fn()}
        rows={[
          {
            id: '#pay-1',
            orderId: 'pay-1',
            counterparty: 'Buyer One',
            counterpartyAvatar: 'BO',
            item: 'Counter sale',
            price: 20,
            date: 'Jul 31, 2026',
            delivery: 'In escrow',
            chain: 'Solana',
            role: 'seller',
            _id: 'pay-1',
            checkoutMode: 'in_person',
          },
          {
            id: '#pay-2',
            orderId: 'pay-2',
            counterparty: 'Buyer Two',
            counterpartyAvatar: 'BT',
            item: 'SmartSite item',
            price: 30,
            date: 'Jul 31, 2026',
            delivery: 'Settled',
            chain: 'Base',
            role: 'seller',
            _id: 'pay-2',
            checkoutMode: 'online',
          },
        ]}
      />
    );

    expect(screen.getByText('In-person checkout')).toBeInTheDocument();
    expect(screen.getByText('SmartSite checkout')).toBeInTheDocument();
    expect(screen.getByText('In escrow')).toBeInTheDocument();
    expect(screen.getAllByText('Settled').length).toBeGreaterThan(0);
  });

  it('preserves the Sold context when opening an order row', () => {
    render(
      <OrdersScreen
        tab="Sold"
        onTabChange={jest.fn()}
        rows={[
          {
            id: '#sold-1',
            orderId: 'sold-1',
            counterparty: 'Buyer One',
            counterpartyAvatar: 'BO',
            item: 'Sold item',
            price: 20,
            date: 'Jul 31, 2026',
            delivery: 'Pending',
            chain: 'Solana',
            role: 'seller',
            _id: 'order-db-id',
            checkoutMode: 'online',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText('Sold item'));

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/order/order-db-id?tab=sold'
    );
  });
});
