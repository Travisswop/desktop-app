import {
  AVERAGE_CHECKING_APY,
  AVERAGE_CREDIT_CARD_APR,
  buildAaveFeedContent,
  buildAavePositionFeedContent,
  buildDefiProjection,
  compoundDelta,
  effectiveAnnualDelta,
} from '@/lib/defi/defiFeed';
import type { AavePosition, AaveReserve } from '@/types/aave';

const usdcReserve: AaveReserve = {
  asset: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  supplyApr: 0.0471,
  supplyApy: 0.0482,
  variableBorrowApr: 0.061,
  variableBorrowApy: 0.063,
  ltv: 0.78,
  liquidationThreshold: 0.8,
  borrowingEnabled: true,
  priceUsd: 1,
  aTokenAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  variableDebtTokenAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
};

describe('DeFi feed card projections', () => {
  it('compares Aave supply APY against checking compounded monthly without double-compounding APY', () => {
    const principal = 12_500;
    const projection = buildDefiProjection({
      action: 'supply',
      principalUsd: principal,
      aaveRate: 0.0482,
      benchmarkRate: AVERAGE_CHECKING_APY.rate,
      years: 5,
    });
    const expectedAaveInterest = effectiveAnnualDelta({
      principal,
      annualRate: 0.0482,
      years: 5,
    });
    const doubleCompoundedApy = compoundDelta({
      principal,
      annualRate: 0.0482,
      years: 5,
      periodsPerYear: 365,
    });
    const expectedCheckingInterest = compoundDelta({
      principal,
      annualRate: AVERAGE_CHECKING_APY.rate,
      years: 5,
      periodsPerYear: 12,
    });

    expect(AVERAGE_CHECKING_APY.rate).toBe(0.0007);
    expect(projection.aaveDelta).toBeCloseTo(expectedAaveInterest, 6);
    expect(projection.aaveDelta).toBeLessThan(doubleCompoundedApy);
    expect(projection.benchmarkDelta).toBeCloseTo(
      expectedCheckingInterest,
      6,
    );
    expect(projection.difference).toBeGreaterThan(3_250);
  });

  it('compares Aave borrow cost against the average credit card APR', () => {
    const projection = buildDefiProjection({
      action: 'borrow',
      principalUsd: 2_500,
      aaveRate: 0.063,
      benchmarkRate: AVERAGE_CREDIT_CARD_APR.rate,
      years: 3,
    });
    const expectedAaveCost = effectiveAnnualDelta({
      principal: 2_500,
      annualRate: 0.063,
      years: 3,
    });

    expect(AVERAGE_CREDIT_CARD_APR.rate).toBe(0.21);
    expect(projection.aaveDelta).toBeCloseTo(expectedAaveCost, 6);
    expect(projection.benchmarkDelta).toBeGreaterThan(projection.aaveDelta);
    expect(projection.difference).toBeGreaterThan(1_000);
  });

  it('builds feed payloads only for supply and borrow actions', () => {
    const supplied = buildAaveFeedContent({
      mode: 'supply',
      chain: 'ethereum',
      txHash: '0xfeed',
      reserve: usdcReserve,
      amount: 125,
      amountUsd: 125,
      walletAddress: '0xabc0000000000000000000000000000000000000',
    });
    const borrowed = buildAaveFeedContent({
      mode: 'borrow',
      chain: 'ethereum',
      txHash: '0xbeef',
      reserve: usdcReserve,
      amount: 250,
      amountUsd: 250,
      walletAddress: '0xabc0000000000000000000000000000000000000',
    });

    expect(supplied).toMatchObject({
      positionKey:
        'aave-v3:ethereum:supply:0xabc0000000000000000000000000000000000000:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      protocol: 'Aave v3',
      action: 'supply',
      symbol: 'USDC',
      aaveRate: usdcReserve.supplyApy,
      benchmarkRate: AVERAGE_CHECKING_APY.rate,
    });
    expect(borrowed).toMatchObject({
      action: 'borrow',
      aaveRate: usdcReserve.variableBorrowApy,
      benchmarkRate: AVERAGE_CREDIT_CARD_APR.rate,
    });
    expect(
      buildAaveFeedContent({
        mode: 'withdraw',
        chain: 'ethereum',
        txHash: '0xnope',
        reserve: usdcReserve,
        amount: 1,
        amountUsd: 1,
      }),
    ).toBeNull();
  });

  it('builds feed payloads from current Aave positions for backfill', () => {
    const daiPosition: AavePosition = {
      asset: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      amount: 75,
      amountRaw: '75000000000000000000',
      usdValue: 75.01,
      supplyApy: 0.043,
      variableBorrowApy: 0.061,
    };

    const content = buildAavePositionFeedContent({
      action: 'supply',
      chain: 'ethereum',
      walletAddress: '0xABC0000000000000000000000000000000000000',
      position: daiPosition,
      updatedAt: '2026-06-21T23:00:00.000Z',
    });

    expect(content).toMatchObject({
      positionKey:
        'aave-v3:ethereum:supply:0xabc0000000000000000000000000000000000000:0x6b175474e89094c44da98b954eedeac495271d0f',
      action: 'supply',
      symbol: 'DAI',
      amount: 75,
      amountUsd: 75.01,
      aaveRate: 0.043,
      benchmarkRate: AVERAGE_CHECKING_APY.rate,
    });
  });
});
