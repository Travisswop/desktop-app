jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/providers/polymarket', () => ({
  PolymarketProviders: ({ children }: { children: unknown }) => children,
  useTrading: jest.fn(),
  usePolymarketWallet: jest.fn(),
}));

jest.mock('@/hooks/polymarket', () => ({
  usePolymarketCollateralBalance: jest.fn(),
  useUserPositions: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/components/wallet/polymarket/PredictionsPanel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/wallet/polymarket/TransferModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/wallet/polymarket/Markets/MarketDetailView', () => ({
  __esModule: true,
  default: () => null,
}));

import type { PolymarketMarket } from '@/hooks/polymarket';
import type { PolymarketAgentOrderPrefill } from '@/lib/chat/agentActionHandoff';
import { parseApprovedActionBoundary } from '@/lib/chat/approvedActionBoundaryQuery';
import { buildApprovedPredictionRouteQuery } from '@/components/wallet/polymarket/PredictionPageContent';
import { buildRecoveredMarketDetailEntry } from '@/app/(pages)/prediction/market/[marketId]/page';

describe('prediction approved-boundary routing helpers', () => {
  test('keeps the approved boundary on the prediction review URL', () => {
    const prefill: PolymarketAgentOrderPrefill = {
      proposalId: 'prop_poly',
      proposalNonce: 'nonce_poly',
      marketRouteKey: 'condition-1',
      tokenId: 'token-yes',
      outcome: 'yes',
      side: 'BUY',
      amount: '25',
      orderType: 'limit',
      limitPrice: '42',
      approvalBoundary: {
        reviewStateLabel: 'User signing required',
        maxOrderUsd: '25',
        maxDailySpendUsd: '80',
        riskControls: ['No more than one live order.'],
      },
    };

    const query = buildApprovedPredictionRouteQuery(prefill);
    const boundary = parseApprovedActionBoundary(query.get('approvalBoundary'));

    expect(query.get('agentAction')).toBe('approved');
    expect(boundary).toMatchObject({
      reviewStateLabel: 'User signing required',
      maxOrderUsd: '25',
      maxDailySpendUsd: '80',
      riskControls: ['No more than one live order.'],
    });
  });

  test('rebuilds the recovered market entry with the approved boundary', () => {
    const boundary = parseApprovedActionBoundary(
      JSON.stringify({
        reviewStateLabel: 'Review trade details',
        maxOrderUsd: '25',
        maxDailyLossUsd: '15',
        riskControls: ['Keep the stop loss armed.'],
      }),
    );

    const entry = buildRecoveredMarketDetailEntry(
      {
        id: 'market-1',
        conditionId: 'condition-1',
        slug: 'market-1',
        question: 'Will Team A win?',
        eventTitle: 'Will Team A win?',
        clobTokenIds: JSON.stringify(['token-yes', 'token-no']),
      } as PolymarketMarket,
      {
        yesShares: 0,
        noShares: 0,
      },
      boundary,
    );

    expect(entry.approvalBoundary).toMatchObject({
      reviewStateLabel: 'Review trade details',
      maxOrderUsd: '25',
      maxDailyLossUsd: '15',
      riskControls: ['Keep the stop loss armed.'],
    });
  });
});
