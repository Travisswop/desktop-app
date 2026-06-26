import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BrowseMarketsBento, {
  SPORT_TABS,
  getCompactSportsOutcomeSelection,
} from '@/components/wallet/polymarket/BrowseMarketsBento';
import type { PolymarketMarket } from '@/hooks/polymarket';

jest.mock('@/hooks/polymarket', () => ({
  useMarkets: jest.fn(() => ({
    data: { pages: [] },
    isLoading: false,
  })),
  useSportsEvents: jest.fn(() => ({
    data: { pages: [] },
    isLoading: false,
  })),
}));

jest.mock('@/hooks/polymarket/usePolymarketTeams', () => ({
  usePolymarketTeams: jest.fn(() => ({ data: null })),
}));

jest.mock('@/hooks/polymarket/useSportsMeta', () => ({
  useSportsMeta: jest.fn(() => ({
    data: { tagIdBySlug: new Map() },
  })),
}));

describe('BrowseMarketsBento sports hero', () => {
  it('defaults the sports hero to All Sports', () => {
    const html = renderToStaticMarkup(
      <BrowseMarketsBento
        onMarketClick={jest.fn()}
        onSportsOutcomeClick={jest.fn()}
        onSportsGameClick={jest.fn()}
        onBrowseSports={jest.fn()}
        onBrowseCategory={jest.fn()}
      />,
    );

    expect(SPORT_TABS[0]).toBe('all');
    expect(html).toContain('No upcoming games for');
    expect(html).toContain('All Sports');
  });

  it('maps compact sports odds clicks to the clicked market outcome', () => {
    const market = {
      id: 'mlb-game-moneyline',
      question: 'Athletics vs. San Francisco Giants',
    } as PolymarketMarket;

    expect(
      getCompactSportsOutcomeSelection(
        market,
        {
          label: 'San Francisco Giants',
          price: 0.61,
          tokenId: 'giants-token',
        },
        false,
      ),
    ).toEqual({
      market,
      outcome: 'San Francisco Giants',
      price: 0.61,
      tokenId: 'giants-token',
    });
  });

  it('uses the outcome source market for split binary sports moneylines', () => {
    const norwayMarket = {
      id: 'norway-win-market',
      question: 'Will Norway win on 2026-06-26?',
    } as PolymarketMarket;
    const franceMarket = {
      id: 'france-win-market',
      question: 'Will France win on 2026-06-26?',
    } as PolymarketMarket;

    expect(
      getCompactSportsOutcomeSelection(
        norwayMarket,
        {
          label: 'France',
          price: 0.7,
          tokenId: 'france-yes-token',
          market: franceMarket,
        },
        false,
      ),
    ).toEqual({
      market: franceMarket,
      outcome: 'France',
      price: 0.7,
      tokenId: 'france-yes-token',
    });
  });

  it('does not open compact sports odds for final games or missing outcomes', () => {
    const market = {
      id: 'finished-game',
      question: 'Finished game',
    } as PolymarketMarket;

    expect(
      getCompactSportsOutcomeSelection(
        market,
        { label: 'Yes', price: 0.5, tokenId: 'yes-token' },
        true,
      ),
    ).toBeNull();
    expect(
      getCompactSportsOutcomeSelection(market, undefined, false),
    ).toBeNull();
    expect(
      getCompactSportsOutcomeSelection(undefined, {
        label: 'Yes',
        price: 0.5,
        tokenId: 'yes-token',
      }, false),
    ).toBeNull();
  });
});
