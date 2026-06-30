import {
  buildPerpsApprovalBoundaryBanner,
  buildPredictionApprovalBoundaryBanner,
} from '@/lib/chat/approvalBoundary';
import {
  getHyperliquidOrderPrefill,
  getPolymarketOrderPrefill,
} from '@/lib/chat/agentActionHandoff';

describe('approvalBoundary', () => {
  test('keeps perps ticket inside the original approved boundary when fields still match', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_hl',
        provider: 'hyperliquid',
        panel: 'perps',
        normalizedParams: {
          coin: 'ETH',
          side: 'long',
          sizeUsd: '1000',
          orderType: 'limit',
          price: '3200',
          leverage: '5',
          isCross: 'false',
          operatingMode: 'paper',
        },
      },
    });

    const banner = buildPerpsApprovalBoundaryBanner(prefill, {
      coin: 'ETH',
      side: 'long',
      orderMode: 'limit',
      sizeUsd: '1000.00',
      sizeCoins: '0.3125',
      leverage: 5,
      isCross: false,
      price: '3200.0',
    });

    expect(banner).toMatchObject({
      tone: 'info',
      operatingModeLabel: 'Paper',
    });
    expect(banner?.detail).toContain('original approved ticket');
  });

  test('downgrades perps boundary copy after ticket edits drift outside the approved values', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_hl',
        provider: 'hyperliquid',
        panel: 'perps',
        normalizedParams: {
          coin: 'ETH',
          side: 'long',
          sizeUsd: '1000',
          leverage: '5',
        },
      },
    });

    const banner = buildPerpsApprovalBoundaryBanner(prefill, {
      coin: 'ETH',
      side: 'short',
      orderMode: 'market',
      sizeUsd: '1500',
      sizeCoins: '0.46',
      leverage: 10,
      isCross: true,
    });

    expect(banner).toMatchObject({
      tone: 'warning',
      title: 'Trade details changed',
    });
  });

  test('downgrades prediction boundary copy after the market or order fields drift', () => {
    const prefill = getPolymarketOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_poly',
        provider: 'polymarket',
        normalizedParams: {
          conditionId: 'condition-1',
          outcomeIndex: 0,
          side: 'buy',
          amount: '25',
          orderType: 'limit',
          price: '0.42',
          executionMode: 'monitor_only',
        },
      },
    });

    const banner = buildPredictionApprovalBoundaryBanner(prefill, {
      marketRouteKey: 'condition-2',
      outcome: 'no',
      side: 'SELL',
      amount: '40',
      orderType: 'market',
    });

    expect(banner).toMatchObject({
      tone: 'warning',
      operatingModeLabel: 'Monitor-only',
    });
    expect(banner?.detail).toContain('no longer matches');
  });
});
