import {
  buildApprovedMarketDetailEntry,
  buildRecoveredMarketDetailEntry,
  buildRecoveredSportsMarketDetailEntry,
  buildSiblingSportsMarketDetailEntry,
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

  test('sports recovery and sibling pivots drop the previous approved context', () => {
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

    expect(recovered.agentOrderPrefill).toBeUndefined();
    expect(sibling.agentOrderPrefill).toBeUndefined();
  });
});
