import { renderToStaticMarkup } from 'react-dom/server';
import {
  OrderConfirmModal,
  type OrderConfirmDetails,
} from '@/components/wallet/perps/OrderConfirmModal';

const DETAILS: OrderConfirmDetails = {
  side: 'long',
  coin: 'ETH',
  modeLabel: 'Market order · Cross margin',
  leverage: 5,
  isCross: true,
  sizeCoins: '0.1000',
  sizeUsd: '250.00',
  entryPrice: '2,500.00',
  liquidationPrice: '2,000.00',
  liquidationDistance: '20.0%',
  estFees: '0.18',
  marginRequired: '50.00',
};

describe('OrderConfirmModal approval boundary', () => {
  test('repeats the approved boundary on the final confirm surface', () => {
    const markup = renderToStaticMarkup(
      <OrderConfirmModal
        isOpen
        details={DETAILS}
        approvalBoundary={{
          reviewStateLabel: 'User signing required',
          maxOrderUsd: '750.75',
          maxDailyLossUsd: '150',
          expiry: '2026-07-01T15:30:00.000Z',
          riskControls: ['Keep the stop loss armed.'],
        }}
        isSubmitting={false}
        onConfirm={async () => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).toContain('Approved Boundary');
    expect(markup).toContain(
      'Goldman approved the original trade with these caps and controls',
    );
    expect(markup).toContain('User signing required');
    expect(markup).toContain('$750.75');
    expect(markup).toContain('Jul 1, 2026, 3:30 PM UTC');
    expect(markup).toContain('Keep the stop loss armed.');
  });
});
