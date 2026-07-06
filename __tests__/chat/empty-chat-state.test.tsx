import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EmptyChatState from '@/components/chat/EmptyChatState';

describe('EmptyChatState', () => {
  it('renders the Astro desk CTA and fallback guidance', () => {
    const html = renderToStaticMarkup(
      <EmptyChatState onOpenAstroDesk={jest.fn()} />
    );

    expect(html).toContain('Open Astro Trading Desk');
    expect(html).toContain(
      'If Create Chat does not list Astro, use this desk entry instead.'
    );
  });

  it('renders the inline empty-state error when the desk cannot open', () => {
    const html = renderToStaticMarkup(
      <EmptyChatState
        astroDeskOpenError="Couldn't open Astro Trading Desk. Try the Messages rail pin or reload chat."
        onOpenAstroDesk={jest.fn()}
      />
    );

    expect(html).toContain(
      'Try the Messages rail pin or reload chat.'
    );
  });
});
