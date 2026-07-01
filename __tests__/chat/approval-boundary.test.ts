import {
  buildPerpsApprovalBoundaryBanner,
  buildPredictionApprovalBoundaryBanner,
  canCompletePredictionAgentHandoff,
  canCompletePerpsAgentHandoff,
  isPerpsTicketInsideApprovedBoundary,
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

  test('invalidates the approved perps completion path after the ticket drifts once', () => {
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

    const matchingTicket = {
      coin: 'ETH',
      side: 'long' as const,
      orderMode: 'market' as const,
      sizeUsd: '1000.00',
      sizeCoins: '0.3125',
      leverage: 5,
      isCross: true,
    };

    expect(
      isPerpsTicketInsideApprovedBoundary(prefill, matchingTicket),
    ).toBe(true);
    expect(
      canCompletePerpsAgentHandoff(prefill, matchingTicket),
    ).toBe(true);

    const banner = buildPerpsApprovalBoundaryBanner(
      prefill,
      matchingTicket,
      {
        approvalPathInvalidated: true,
      },
    );

    expect(
      canCompletePerpsAgentHandoff(prefill, matchingTicket, {
        approvalPathInvalidated: true,
      }),
    ).toBe(false);
    expect(banner).toMatchObject({
      tone: 'warning',
      title: 'Approved trade draft expired',
    });
    expect(banner?.detail).toContain('approved handoff no longer applies');
  });

  test('blocks perps handoff completion after a market pivot changes the coin', () => {
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

    expect(
      canCompletePerpsAgentHandoff(prefill, {
        coin: 'BTC',
        side: 'long',
        orderMode: 'market',
        sizeUsd: '1000.00',
        sizeCoins: '0.01',
        leverage: 5,
        isCross: true,
      }),
    ).toBe(false);
  });

  test('blocks perps handoff completion after a same-symbol venue pivot changes the asset identity', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_hl_builder',
        provider: 'hyperliquid',
        panel: 'perps',
        normalizedParams: {
          coin: 'ETH',
          side: 'long',
          sizeUsd: '1000',
          leverage: '5',
          assetIndex: 110000,
          dex: 'builder-dex',
        },
      },
    });

    expect(
      isPerpsTicketInsideApprovedBoundary(prefill, {
        coin: 'ETH',
        assetIndex: 110000,
        dex: 'builder-dex',
        side: 'long',
        orderMode: 'market',
        sizeUsd: '1000.00',
        sizeCoins: '0.55',
        leverage: 5,
        isCross: true,
      }),
    ).toBe(true);

    expect(
      canCompletePerpsAgentHandoff(prefill, {
        coin: 'ETH',
        assetIndex: 0,
        dex: null,
        side: 'long',
        orderMode: 'market',
        sizeUsd: '1000.00',
        sizeCoins: '0.55',
        leverage: 5,
        isCross: true,
      }),
    ).toBe(false);
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

  test('blocks prediction completion when the edited ticket drifts outside the approved boundary', () => {
    const prefill = getPolymarketOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_poly',
        provider: 'polymarket',
        normalizedParams: {
          conditionId: 'condition-1',
          outcomeIndex: 0,
          side: 'buy',
          amountUsd: '25',
          orderType: 'limit',
          price: '0.42',
        },
      },
    });

    expect(
      canCompletePredictionAgentHandoff(prefill, {
        marketRouteKey: 'condition-1',
        outcome: 'yes',
        side: 'BUY',
        amount: '25',
        shareAmount: '59.52380952',
        amountUnit: 'usd',
        orderType: 'limit',
        limitPrice: '42',
      }),
    ).toBe(true);

    expect(
      canCompletePredictionAgentHandoff(prefill, {
        marketRouteKey: 'condition-1',
        outcome: 'yes',
        side: 'BUY',
        amount: '40',
        shareAmount: '95.23809524',
        amountUnit: 'usd',
        orderType: 'limit',
        limitPrice: '42',
      }),
    ).toBe(false);
  });

  test('keeps prediction approval invalidated after a drift even if fields are edited back', () => {
    const prefill = getPolymarketOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_poly',
        provider: 'polymarket',
        normalizedParams: {
          conditionId: 'condition-1',
          outcomeIndex: 0,
          side: 'buy',
          amountUsd: '25',
          orderType: 'limit',
          price: '0.42',
          executionMode: 'shadow',
        },
      },
    });

    const matchingTicket = {
      marketRouteKey: 'condition-1',
      outcome: 'yes' as const,
      side: 'BUY' as const,
      amount: '25',
      shareAmount: '59.52380952',
      amountUnit: 'usd' as const,
      orderType: 'limit' as const,
      limitPrice: '42',
    };

    expect(
      canCompletePredictionAgentHandoff(prefill, matchingTicket),
    ).toBe(true);
    expect(
      canCompletePredictionAgentHandoff(prefill, matchingTicket, {
        approvalPathInvalidated: true,
      }),
    ).toBe(false);

    const banner = buildPredictionApprovalBoundaryBanner(
      prefill,
      matchingTicket,
      {
        approvalPathInvalidated: true,
      },
    );

    expect(banner).toMatchObject({
      tone: 'warning',
      title: 'Approved prediction draft expired',
      operatingModeLabel: 'Shadow',
    });
    expect(banner?.detail).toContain('approved handoff no longer applies');
  });

  test('treats share-denominated market buys as manual review on reopened prediction tickets', () => {
    const prefill = getPolymarketOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_poly',
        provider: 'polymarket',
        normalizedParams: {
          conditionId: 'condition-1',
          outcomeIndex: 0,
          side: 'buy',
          shares: '25',
          orderType: 'market',
          executionMode: 'monitor_only',
        },
      },
    });

    const banner = buildPredictionApprovalBoundaryBanner(prefill, {
      marketRouteKey: 'condition-1',
      outcome: 'yes',
      side: 'BUY',
      amount: '25',
      shareAmount: '25',
      amountUnit: 'usd',
      orderType: 'market',
    });

    expect(
      canCompletePredictionAgentHandoff(prefill, {
        marketRouteKey: 'condition-1',
        outcome: 'yes',
        side: 'BUY',
        amount: '25',
        shareAmount: '25',
        amountUnit: 'usd',
        orderType: 'market',
      }),
    ).toBe(false);
    expect(banner).toMatchObject({
      tone: 'warning',
      operatingModeLabel: 'Monitor-only',
    });
  });
});
