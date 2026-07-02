import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketPriceDelayNotice } from '@/components/wallet/market-price-delay-notice';

describe('market price delay notice', () => {
  it('renders delayed-price copy when the market price is degraded', () => {
    const markup = renderToStaticMarkup(
      <MarketPriceDelayNotice degraded />,
    );

    expect(markup).toContain('Price delayed');
  });

  it('renders nothing when the market price is healthy', () => {
    const markup = renderToStaticMarkup(
      <MarketPriceDelayNotice degraded={false} />,
    );

    expect(markup).toBe('');
  });
});
