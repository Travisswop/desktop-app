import {
  buildApprovedMarketDetailEntry,
  buildRecoveredMarketDetailEntry,
  buildRecoveredSportsMarketDetailEntry,
  buildSiblingSportsMarketDetailEntry,
  resolvePredictionInitialTicketState,
} from '@/lib/polymarket/marketDetailEntries';

describe('prediction market detail entries', () => {
  const market = {
    id: 'market-1',
    conditionId: 'condition-1',
    slug: 'market-1',
    question: 'Will ETH rise?',
  } as any;

  test('stores approved action context only on the initial approved entry', () => {
    const entry = buildApprovedMarketDetailEntry(market, {
      proposalId: 'prop-1',
      proposalNonce: 'nonce-1',
      marketRouteKey: 'condition-1',
      outcome: 'yes',
      side: 'BUY',
      amount: '25',
      amountUnit: 'usd',
      orderType: 'limit',
      limitPrice: '42',
      operatingModeLabel: 'Shadow',
    });

    expect(entry.agentOrderPrefill).toMatchObject({
      proposalId: 'prop-1',
      operatingModeLabel: 'Shadow',
    });
    expect(entry.initialOutcome).toBe('yes');
  });

  test('converts approved share-sized limit buys into a dollar ticket input', () => {
    const entry = buildApprovedMarketDetailEntry(market, {
      proposalId: 'prop-1',
      marketRouteKey: 'condition-1',
      outcome: 'yes',
      side: 'BUY',
      amount: '10',
      amountUnit: 'shares',
      orderType: 'limit',
      limitPrice: '42',
    });

    expect(entry.initialAmount).toBe('4.2');
  });

  test('clears approved share-sized market buys because the reopened BUY input is dollar-based', () => {
    const entry = buildApprovedMarketDetailEntry(market, {
      proposalId: 'prop-1',
      marketRouteKey: 'condition-1',
      outcome: 'yes',
      side: 'BUY',
      amount: '10',
      amountUnit: 'shares',
      orderType: 'market',
    });

    expect(entry.initialAmount).toBeUndefined();
  });

  test('recovered entries clear stale approved action context on plain revisit', () => {
    const entry = buildRecoveredMarketDetailEntry(market, {
      yesShares: 1,
      noShares: 0,
    });

    expect(entry.agentOrderPrefill).toBeUndefined();
  });

  test('recovered revisits ignore legacy prediction ticket query params', () => {
    const entry = buildRecoveredMarketDetailEntry(market, {
      yesShares: 1,
      noShares: 0,
    });

    expect(
      resolvePredictionInitialTicketState(entry, {
        outcome: 'no',
        amount: '25',
        side: 'BUY',
        orderType: 'limit',
        limitPrice: '42',
      }),
    ).toEqual({
      initialOutcome: undefined,
      initialAmount: undefined,
      initialSide: undefined,
      initialOrderType: undefined,
      initialLimitPrice: undefined,
    });
  });

  test('sports recovery keeps approved context for the same ticket but sibling pivots drop it', () => {
    const snapshot = buildApprovedMarketDetailEntry(market, {
      proposalId: 'prop-1',
      marketRouteKey: 'condition-1',
    });
    const recovered = buildRecoveredSportsMarketDetailEntry(
      snapshot,
      {
        market,
        game: { id: 'game-1' } as any,
        selection: { initialOutcome: 'yes' },
      } as any,
      { yesShares: 3, noShares: 1 },
    );
    const sibling = buildSiblingSportsMarketDetailEntry(
      { id: 'game-1' } as any,
      {
        ...market,
        id: 'market-2',
        conditionId: 'condition-2',
        slug: 'market-2',
      },
      { initialOutcome: 'no' },
      { yesShares: 0, noShares: 2 },
    );

    expect(recovered.agentOrderPrefill).toMatchObject({
      proposalId: 'prop-1',
      marketRouteKey: 'condition-1',
    });
    expect(sibling.agentOrderPrefill).toBeUndefined();
  });
});
