import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatThreadEmptyState from '@/components/chat/ChatThreadEmptyState';
import { getGroupModalNoResultsState } from '@/lib/chat/groupModalEmptyState';

describe('Astro chat empty-state affordances', () => {
  it('renders an Astro desk CTA for the no-thread chat state', () => {
    const html = renderToStaticMarkup(
      <ChatThreadEmptyState onOpenAstroThread={() => undefined} />
    );

    expect(html).toContain('Open Astro Trading Desk');
    expect(html).toContain('Start with Astro Trading Desk');
  });

  it('surfaces Astro-specific recovery copy in direct search', () => {
    expect(getGroupModalNoResultsState('direct', 'astro')).toEqual({
      title: "Astro isn't a direct contact",
      detail:
        'Use Astro Trading Desk to start an Astro conversation. Direct recipient search only lists people.',
      actionLabel: 'Open Astro Trading Desk',
    });
  });

  it('keeps generic no-results copy for other direct searches', () => {
    expect(getGroupModalNoResultsState('direct', 'travis')).toEqual({
      title: 'No matches',
      detail: 'Try another name or handle.',
    });
  });
});
