import { resolvePredictionFeedExecution } from '@/lib/polymarket/orderExecution';

describe('prediction feed execution accounting', () => {
  it('records the actual sold-share basis from the portfolio entry price', () => {
    const resolved = resolvePredictionFeedExecution(
      {
        status: 'matched',
        execution: {
          shares: 20,
          price: 0.7,
          proceeds: 14,
          status: 'filled',
        },
      },
      {
        side: 'SELL',
        cost: 15,
        price: 0.75,
        positionEntryPrice: 0.4,
      },
    );

    expect(resolved.fields).toMatchObject({
      executedShares: 20,
      executedProceeds: 14,
      positionEntryPrice: 0.4,
      positionCostBasisUsd: 8,
    });
  });
});
