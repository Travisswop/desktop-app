import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BrowseMarketsBento, {
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

    expect(html).toContain('No upcoming games for');
    expect(html).toContain('All Sports');
    // Group tabs (Basketball, Football, Combat), not the flat NBA/WNBA/NFL/
    // CFB/MMA/Boxing list they collapse. Also covers a couple of the
    // previously-missing sports now shown alongside the featured ones.
    expect(html).toContain('Basketball');
    expect(html).toContain('Football');
    expect(html).toContain('Combat');
    expect(html).toContain('Cricket');
    expect(html).toContain('Chess');
    // No group is expanded until one is clicked, so NBA shouldn't appear on
    // first render (it's folded inside the unexpanded Basketball tab).
    expect(html).not.toContain('>NBA<');
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
