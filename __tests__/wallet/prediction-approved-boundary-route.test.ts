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
import {
  persistApprovedPredictionBoundary,
  readApprovedPredictionBoundary,
  serializeApprovedActionBoundary,
} from '@/lib/chat/approvedActionBoundaryQuery';
import { buildApprovedPredictionRouteQuery } from '@/components/wallet/polymarket/PredictionPageContent';
import { buildRecoveredMarketDetailEntry } from '@/app/(pages)/prediction/market/[marketId]/page';

const sessionStorageState = new Map<string, string>();

function installWindowSessionStorage() {
  const sessionStorage = {
    getItem: (key: string) => sessionStorageState.get(key) ?? null,
    setItem: (key: string, value: string) => {
      sessionStorageState.set(key, value);
    },
    removeItem: (key: string) => {
      sessionStorageState.delete(key);
    },
    clear: () => {
      sessionStorageState.clear();
    },
    key: (index: number) => Array.from(sessionStorageState.keys())[index] ?? null,
    get length() {
      return sessionStorageState.size;
    },
  };

  Object.defineProperty(globalThis, 'window', {
    value: { sessionStorage },
    configurable: true,
  });
}

describe('prediction approved-boundary routing helpers', () => {
  beforeAll(() => {
    installWindowSessionStorage();
  });

  beforeEach(() => {
    sessionStorageState.clear();
  });

  test('keeps the prediction review URL free of trusted boundary data', () => {
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

    expect(query.get('agentAction')).toBe('approved');
    expect(query.get('approvalBoundary')).toBeNull();
  });

  test('recovers the approved boundary from trusted session storage', () => {
    persistApprovedPredictionBoundary(
      {
        marketId: 'condition-1',
        proposalId: 'prop_poly',
      },
      {
        reviewStateLabel: 'User signing required',
        maxOrderUsd: '25',
        maxDailySpendUsd: '80',
        riskControls: ['No more than one live order.'],
      },
    );

    expect(
      readApprovedPredictionBoundary({
        marketId: 'condition-1',
        proposalId: 'prop_poly',
      }),
    ).toMatchObject({
      reviewStateLabel: 'User signing required',
      maxOrderUsd: '25',
      maxDailySpendUsd: '80',
      riskControls: ['No more than one live order.'],
    });
  });

  test('rebuilds the recovered market entry with the approved boundary', () => {
    persistApprovedPredictionBoundary(
      {
        marketId: 'condition-1',
        proposalId: 'prop_poly',
      },
      {
        reviewStateLabel: 'Review trade details',
        maxOrderUsd: '25',
        maxDailyLossUsd: '15',
        riskControls: ['Keep the stop loss armed.'],
      },
    );

    const boundary = readApprovedPredictionBoundary({
      marketId: 'condition-1',
      proposalId: 'prop_poly',
    });

    expect(boundary).toBeTruthy();

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

  test('does not restore a stale boundary on a plain market revisit', () => {
    sessionStorageState.set(
      'swop:prediction-approved-boundary:market:condition-1',
      serializeApprovedActionBoundary({
        reviewStateLabel: 'User signing required',
        maxOrderUsd: '25',
        maxDailySpendUsd: '80',
        riskControls: ['No more than one live order.'],
      })!,
    );

    expect(
      readApprovedPredictionBoundary({
        marketId: 'condition-1',
      }),
    ).toBeNull();

    expect(
      sessionStorageState.has(
        'swop:prediction-approved-boundary:market:condition-1',
      ),
    ).toBe(false);
  });

  test('clears the stored approved boundary when a later launch has no boundary', () => {
    persistApprovedPredictionBoundary(
      {
        marketId: 'condition-1',
        proposalId: 'prop_poly',
      },
      {
        reviewStateLabel: 'User signing required',
        maxOrderUsd: '25',
        maxDailySpendUsd: '80',
        riskControls: ['No more than one live order.'],
      },
    );

    persistApprovedPredictionBoundary(
      {
        marketId: 'condition-1',
        proposalId: 'prop_poly',
      },
      null,
    );

    expect(
      readApprovedPredictionBoundary({
        marketId: 'condition-1',
        proposalId: 'prop_poly',
      }),
    ).toBeNull();
  });
});
