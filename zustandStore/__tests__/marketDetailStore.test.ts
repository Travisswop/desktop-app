import type { PolymarketMarket } from '@/hooks/polymarket';
import {
  marketDetailHref,
  marketRouteKey,
  normalizeMarketDetailHref,
} from '../marketDetailStore';

describe('market detail routing helpers', () => {
  const mexicoKoreaMarket = {
    id: '1897115',
    conditionId:
      '0x6f05c7bc5ad978f8f9916f05d30a7f752e02b81508c56d82ed7c9245bca163b0',
    slug: 'fifwc-mex-kr-2026-06-18-mex',
    question: 'Will Mexico win on 2026-06-18?',
    eventTitle: 'Mexico vs. Korea Republic',
  } as PolymarketMarket;

  it('uses conditionId for Swop prediction market routes', () => {
    expect(marketRouteKey(mexicoKoreaMarket)).toBe(
      mexicoKoreaMarket.conditionId,
    );
    expect(marketDetailHref(mexicoKoreaMarket)).toBe(
      `/prediction/market/${mexicoKoreaMarket.conditionId}`,
    );
  });

  it('keeps fallback prediction hrefs internal to Swop', () => {
    expect(normalizeMarketDetailHref('/prediction/market/1897115')).toBe(
      '/prediction/market/1897115',
    );
    expect(
      normalizeMarketDetailHref('https://polymarket.com/event/mexico-korea'),
    ).toBe('/prediction');
    expect(marketDetailHref(null)).toBe('/prediction');
  });
});
